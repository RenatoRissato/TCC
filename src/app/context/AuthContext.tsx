import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { criarRotasPadrao } from '../services/rotaService';
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
    plate: m.placa_van ?? undefined,
    vehicle: [m.marca_van, m.modelo_van].filter(Boolean).join(' ') || undefined,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout após ${ms}ms`)), ms)
    ),
  ]);
}

// Detecta o sintoma de JWT inválido: PostgREST trata o request como `anon`
// e o Postgres devolve permission denied com hint mencionando "TO anon".
function ehErroDeJwtInvalido(error: { code?: string; hint?: string | null } | null | undefined): boolean {
  if (!error) return false;
  return error.code === '42501' && !!error.hint && error.hint.includes('TO anon');
}

async function carregarMotorista(userId: string): Promise<MotoristaRow | null> {
  const { data, error } = await supabase
    .from('motoristas')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('Erro ao carregar motorista:', error);
    if (ehErroDeJwtInvalido(error)) {
      console.warn('JWT inválido detectado — fazendo signOut para forçar reauth.');
      await supabase.auth.signOut();
    }
    return null;
  }
  return data as MotoristaRow | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [motoristaId, setMotoristaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Marca o último user_id já hidratado (motorista carregado do DB).
  // Evita re-hidratação desnecessária em TOKEN_REFRESHED, retorno-de-aba,
  // e outros eventos do Supabase que disparam onAuthStateChange sem que
  // o perfil tenha mudado. Cada re-hidratação custa 1 query + risco de
  // timeout (a aba pode estar despertando do background com network frio).
  const lastLoadedUserId = useRef<string | null>(null);

  const hidratarSessao = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      setMotoristaId(null);
      lastLoadedUserId.current = null;
      return;
    }

    const userId = session.user.id;

    // Já hidratamos completamente esse user antes? Pula. JWT pode ter sido
    // renovado, mas o perfil não mudou — não há nada a buscar.
    if (lastLoadedUserId.current === userId) return;

    // 1) Fallback IMEDIATO a partir do JWT (zero await) — mas SÓ se ainda não
    // temos esse user carregado. Em TOKEN_REFRESHED (a cada ~50min) o id é o
    // mesmo, e resetar pro fallback faria piscar o email no header até a query
    // do motorista responder. Preservamos o user atual; o reload abaixo só
    // SOBRE-ESCREVE se conseguir dados novos.
    const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
    const pickName = (...keys: string[]) => {
      for (const k of keys) {
        const v = meta[k];
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
      return '';
    };
    const metaName = pickName('nome', 'name', 'full_name', 'display_name');
    const metaPhone = pickName('telefone', 'phone', 'phone_number');
    const metaCnh = pickName('cnh');
    const metaPlacaVan = pickName('placa_van');
    const metaMarcaVan = pickName('marca_van');
    const metaModeloVan = pickName('modelo_van');
    const rawAnoVan = meta['ano_van'];
    const metaAnoVan = typeof rawAnoVan === 'number'
      ? rawAnoVan
      : typeof rawAnoVan === 'string' && rawAnoVan.trim()
        ? Number.parseInt(rawAnoVan.trim(), 10)
        : null;
    const fallbackName = metaName || session.user.email?.split('@')[0] || 'Motorista';
    setUser(prev => {
      if (prev && prev.id === userId) return prev;
      return {
        id: userId,
        name: fallbackName,
        email: session.user.email ?? '',
        phone: metaPhone.replace(/\D/g, ''),
        cnh: metaCnh || null,
        plate: metaPlacaVan || undefined,
        vehicle: [metaMarcaVan, metaModeloVan].filter(Boolean).join(' ') || undefined,
      };
    });

    // 2a) Hidratação OTIMISTA do motoristaId via cache local. Em reabertura
    // do app, o JWT precisa refresh + cold start do free tier somam 5-15s
    // antes da query do motorista responder. Durante esse tempo, motoristaId
    // fica null e os useEffects do Dashboard não disparam — usuário vê tela
    // vazia. Setar motoristaId do cache agora desbloqueia os hooks downstream
    // imediatamente; a query abaixo continua e revalida em background.
    try {
      const cached = localStorage.getItem(`sr_motorista_${userId}`);
      if (cached) setMotoristaId(cached);
    } catch { /* localStorage indisponível — segue sem cache */ }

    // 2b) Carrega o perfil real em background, com timeout — se travar, mantém o fallback.
    // 15s cobre cold start realista do Supabase free tier + latência intercontinental.
    // Se mesmo assim travar, o fallback do JWT já tem nome/email — UX não quebra.
    let motorista: MotoristaRow | null = null;
    try {
      motorista = await withTimeout(carregarMotorista(userId), 15000);
    } catch (err) {
      // console.debug em vez de warn: é caminho de fallback esperado, não anomalia.
      // O próximo evento auth (visibility, token refresh, login) tentará de novo.
      console.debug('carregarMotorista demorou — usando fallback do JWT:', err);
      return;
    }

    // 3) Sem perfil no DB? Tenta auto-criar via Edge Function (também com timeout)
    let motoristaAcabouDeNascer = false;
    if (!motorista) {
      console.log('[hidratarSessao] motorista não existe — chamando Edge Function');
      try {
        const telefone = metaPhone.replace(/\D/g, '') || null;
        const { data: fnData, error: fnError } = await withTimeout(
          supabase.functions.invoke('criar-perfil-motorista', {
            body: {
              nome: fallbackName,
              telefone,
              cnh: metaCnh || null,
              placa_van: metaPlacaVan || null,
              marca_van: metaMarcaVan || null,
              modelo_van: metaModeloVan || null,
              ano_van: Number.isFinite(metaAnoVan) ? metaAnoVan : null,
            },
          }),
          10000,
        );
        if (fnError) {
          console.error('[hidratarSessao] criar-perfil-motorista falhou:', fnError);
          return;
        }
        console.log('[hidratarSessao] Edge Function retornou:', fnData);
        motorista = await withTimeout(carregarMotorista(userId), 15000);
        if (motorista) motoristaAcabouDeNascer = true;
      } catch (err) {
        console.debug('[hidratarSessao] auto-criação do perfil demorou — usando fallback do JWT:', err);
        return;
      }
    }

    if (motorista) {
      // Fallback idempotente: a Edge Function já cria as rotas, mas se ela
      // for de uma versão antiga ou tiver falhado parcialmente, garantimos
      // aqui no primeiro login após registro. Se as rotas já existem,
      // criarRotasPadrao retorna sem inserir.
      if (motoristaAcabouDeNascer || true) {
        console.log('[hidratarSessao] motorista recém-criado — fallback criarRotasPadrao para', motorista.id);
        const r = await criarRotasPadrao(motorista.id);
        console.log('[hidratarSessao] criarRotasPadrao resultado:', r);
      }

      setUser(motoristaToUser(motorista));
      setMotoristaId(motorista.id);
      lastLoadedUserId.current = userId;

      // Atualiza cache para próxima reabertura — motoristaId é estável
      // (1 user → 1 motorista), então cache não precisa de TTL.
      try { localStorage.setItem(`sr_motorista_${userId}`, motorista.id); } catch { /* ok */ }
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    let initial = true;

    // onAuthStateChange dispara INITIAL_SESSION ao se inscrever — não precisamos
    // chamar getSession() separadamente (evita race condition + auth lock contention)
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!ativo) return;
      try {
        await hidratarSessao(session);
      } catch (err) {
        console.error('Erro ao hidratar sessão:', err);
      } finally {
        if (initial && ativo) {
          initial = false;
          setLoading(false);
        }
      }
    });

    // Safety net: se o listener nunca disparar por algum motivo, libera o loading
    const safetyTimer = setTimeout(() => {
      if (initial && ativo) {
        initial = false;
        setLoading(false);
      }
    }, 5000);

    return () => {
      ativo = false;
      clearTimeout(safetyTimer);
      sub.subscription.unsubscribe();
    };
  }, [hidratarSessao]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        30000,
      );
      if (error) return { ok: false, errorMessage: traduzirAuthErro(error.message) };
      return { ok: true };
    } catch {
      return { ok: false, errorMessage: 'Servidor não respondeu. Verifique sua conexão e tente novamente.' };
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<RegisterResult> => {
    console.log('[register] iniciando registro', { email: data.email, nome: data.name });

    let signUpData: Awaited<ReturnType<typeof supabase.auth.signUp>>['data'];
    let signUpError: Awaited<ReturnType<typeof supabase.auth.signUp>>['error'];
    try {
      const res = await withTimeout(
        supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              nome: data.name,
              telefone: normalizarTelefone(data.phone),
              cnh: null,
              placa_van: data.plate?.trim() || null,
              marca_van: data.vehicleBrand?.trim() || null,
              modelo_van: data.vehicleModel?.trim() || null,
              ano_van: data.vehicleYear ?? null,
            },
          },
        }),
        10000,
      );
      signUpData = res.data;
      signUpError = res.error;
    } catch (err) {
      console.error('[register] signUp timeout/throw:', err);
      return { ok: false, errorMessage: 'Servidor não respondeu. Verifique sua conexão e tente novamente.' };
    }
    if (signUpError) {
      console.error('[register] signUp error:', signUpError);
      return { ok: false, errorMessage: traduzirAuthErro(signUpError.message) };
    }
    if (!signUpData.user) {
      console.error('[register] signUp sem user retornado');
      return { ok: false, errorMessage: 'O servidor não retornou um usuário válido. Tente novamente.' };
    }
    console.log('[register] signUp OK', {
      userId: signUpData.user.id,
      temSession: !!signUpData.session,
    });

    // Quando "Confirm email" está ativo no projeto, signUp não devolve sessão.
    // Sem sessão, não dá pra chamar a Edge Function (precisa de JWT). O perfil
    // será criado no primeiro login após o usuário confirmar o email.
    if (!signUpData.session) {
      console.log('[register] sem session — confirmação de email pendente');
      return { ok: true, needsEmailConfirmation: true };
    }

    console.log('[register] chamando Edge Function criar-perfil-motorista');
    const { data: fnData, error: fnError } = await supabase.functions.invoke('criar-perfil-motorista', {
      body: {
        nome: data.name,
        telefone: normalizarTelefone(data.phone),
        cnh: null,
        placa_van: data.plate?.trim() || null,
        marca_van: data.vehicleBrand?.trim() || null,
        modelo_van: data.vehicleModel?.trim() || null,
        ano_van: data.vehicleYear ?? null,
      },
    });
    if (fnError) {
      console.error('[register] criar-perfil-motorista falhou:', fnError);
      return {
        ok: false,
        errorMessage: 'Conta criada, mas houve um erro ao montar o perfil de motorista. Faça login para tentar novamente.',
      };
    }
    console.log('[register] Edge Function retornou:', fnData);

    // A Edge Function já cria as 3 rotas padrão (Manhã/Tarde/Noite) no mesmo
    // request, com JWT validado e bypassando race conditions de RLS no client.
    // Aqui chamamos criarRotasPadrao como FALLBACK idempotente: se a Edge
    // Function for uma versão antiga (sem a feature de rotas), garantimos
    // que as rotas existam. Se já existirem, a função retorna sem inserir.
    const motoristaIdCriado = (fnData as { motorista?: { id?: string } } | null)?.motorista?.id;
    if (motoristaIdCriado) {
      console.log('[register] fallback criarRotasPadrao para motorista', motoristaIdCriado);
      const r = await criarRotasPadrao(motoristaIdCriado);
      console.log('[register] criarRotasPadrao resultado:', r);
    } else {
      console.warn('[register] motorista.id ausente no retorno da Edge Function');
    }

    console.log('[register] hidratando sessão...');
    await hidratarSessao(signUpData.session);
    console.log('[register] concluído com sucesso');
    return { ok: true };
  }, [hidratarSessao]);

  const logout = useCallback(async () => {
    // Limpa cache local antes de qualquer coisa — evita que outro usuário
    // logando no mesmo browser herde rotas/motorista_id da conta anterior.
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sr_'))
        .forEach(k => localStorage.removeItem(k));
    } catch { /* ok */ }

    // Limpa estado local IMEDIATAMENTE — não espera round-trip pro servidor.
    // setUser(null) já dispara isAuthenticated=false no AuthGate, que desmonta
    // o RouterProvider e mostra a LoginScreen. UX instantâneo.
    setUser(null);
    setMotoristaId(null);
    lastLoadedUserId.current = null;

    // Em paralelo, avisa o Supabase. scope:'local' só invalida ESTA sessão
    // (não toca outras devices) e responde bem mais rápido que o default
    // 'global'. Se falhar, a sessão local já foi limpa e a próxima leitura
    // do localStorage cai em null naturalmente.
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.debug('signOut server call falhou (estado local já foi limpo):', err);
    }
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
