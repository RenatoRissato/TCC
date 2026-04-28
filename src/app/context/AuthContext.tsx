import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import type { MotoristaRow } from '../types/database';
import type { RegisterData, User } from '../types';

export interface RegisterResult {
  ok: boolean;
  errorMessage?: string;
  needsEmailConfirmation?: boolean;
}

export interface LoginResult {
  ok: boolean;
  errorMessage?: string;
}

interface AuthContextType {
  user: User | null;
  motoristaId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function normalizarTelefone(input: string): string {
  return input.replace(/\D/g, '');
}

function traduzirAuthErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
  if (m.includes('user already registered') || m.includes('already exists')) return 'Já existe uma conta com este e-mail.';
  if (m.includes('password should be') || m.includes('password is too')) return 'Senha muito curta. Use ao menos 6 caracteres.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos.';
  return msg;
}

function motoristaToUser(m: MotoristaRow): User {
  return {
    id: m.id,
    name: m.nome,
    email: m.email,
    phone: m.telefone ?? '',
    cnh: m.cnh,
  };
}

async function carregarMotorista(userId: string): Promise<MotoristaRow | null> {
  const { data, error } = await supabase
    .from('motoristas')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('Erro ao carregar motorista:', error);
    return null;
  }
  return data as MotoristaRow | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [motoristaId, setMotoristaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const hidratarSessao = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      setMotoristaId(null);
      return;
    }
    let motorista = await carregarMotorista(session.user.id);

    // Auto-cria o perfil quando o usuário acabou de confirmar o email
    // (signUp não devolveu sessão na hora, então a Edge Function nunca rodou).
    if (!motorista) {
      const meta = (session.user.user_metadata ?? {}) as { nome?: string; telefone?: string };
      const nome = meta.nome?.trim() || session.user.email?.split('@')[0] || 'Motorista';
      const telefone = (meta.telefone ?? '').replace(/\D/g, '') || null;
      const { error: fnError } = await supabase.functions.invoke('criar-perfil-motorista', {
        body: { nome, telefone, cnh: null },
      });
      if (fnError) {
        console.error('Auto-criação do perfil falhou:', fnError);
      } else {
        motorista = await carregarMotorista(session.user.id);
      }
    }

    if (motorista) {
      setUser(motoristaToUser(motorista));
      setMotoristaId(motorista.id);
    } else {
      setUser({
        id: session.user.id,
        name: session.user.email?.split('@')[0] ?? 'Motorista',
        email: session.user.email ?? '',
        phone: '',
        cnh: null,
      });
      setMotoristaId(null);
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return;
      await hidratarSessao(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!ativo) return;
      await hidratarSessao(session);
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, [hidratarSessao]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { ok: false, errorMessage: traduzirAuthErro(error.message) };
    }
    return { ok: true };
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<RegisterResult> => {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          nome: data.name,
          telefone: normalizarTelefone(data.phone),
        },
      },
    });
    if (signUpError) {
      return { ok: false, errorMessage: traduzirAuthErro(signUpError.message) };
    }
    if (!signUpData.user) {
      return { ok: false, errorMessage: 'O servidor não retornou um usuário válido. Tente novamente.' };
    }

    // Quando "Confirm email" está ativo no projeto, signUp não devolve sessão.
    // Sem sessão, não dá pra chamar a Edge Function (precisa de JWT). O perfil
    // será criado no primeiro login após o usuário confirmar o email.
    if (!signUpData.session) {
      return { ok: true, needsEmailConfirmation: true };
    }

    const { error: fnError } = await supabase.functions.invoke('criar-perfil-motorista', {
      body: {
        nome: data.name,
        telefone: normalizarTelefone(data.phone),
        cnh: null,
      },
    });
    if (fnError) {
      console.error('criar-perfil-motorista falhou:', fnError);
      return {
        ok: false,
        errorMessage: 'Conta criada, mas houve um erro ao montar o perfil de motorista. Faça login para tentar novamente.',
      };
    }

    await hidratarSessao(signUpData.session);
    return { ok: true };
  }, [hidratarSessao]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMotoristaId(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      motoristaId,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
