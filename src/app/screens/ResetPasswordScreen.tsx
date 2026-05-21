import { useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { APP_VERSION } from '../utils/appVersion';

// Sem props — após o reset (sucesso ou link inválido) fazemos hard navigation
// via window.location.replace('/'), que recarrega o app e reseta o AuthGate.

function Spinner() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={3} strokeLinecap="round"
      style={{ animation: 'auth-spin 0.75s linear infinite', flexShrink: 0 }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

export function ResetPasswordScreen() {
  const { isDark } = useTheme();

  // O Supabase consome o token na URL via detectSessionInUrl e cria uma
  // sessão de recovery. Se o usuário chegou aqui sem sessão, o link expirou
  // ou foi adulterado — mostramos erro e oferecemos voltar.
  const [linkValido, setLinkValido] = useState<boolean | null>(null);
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirm, setMostrarConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    // Pequena espera pro detectSessionInUrl terminar de processar o hash da URL.
    // Em testes locais o getSession é síncrono o suficiente — mas damos uma
    // janela curta caso o Supabase ainda esteja parseando.
    let cancelado = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelado) return;
      setLinkValido(!!data.session);
    })();
    return () => { cancelado = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (senha.length < 6) { setErro('A senha precisa ter ao menos 6 caracteres.'); return; }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setLoading(false);
      const msg = error.message.toLowerCase();
      if (msg.includes('same') || msg.includes('new password should be different')) {
        setErro('A nova senha deve ser diferente da atual.');
      } else {
        setErro('Não foi possível atualizar a senha. O link pode ter expirado — solicite um novo.');
      }
      return;
    }

    // Limpa a sessão de recovery e sinaliza pra LoginScreen mostrar o banner.
    try {
      sessionStorage.setItem('sr_reset_success', '1');
    } catch { /* ok */ }
    await supabase.auth.signOut({ scope: 'local' });

    // Navegação dura (reload) — necessária porque o createBrowserRouter
    // captura a URL na criação e não reage a history.replaceState. Sem
    // o reload, ao montar o RouterProvider ele acha que está em
    // /redefinir-senha (rota inexistente) e cai no ErrorBoundary default.
    window.location.replace('/');
  };

  const bg       = isDark ? '#0F1117'              : '#F0F2F5';
  const cardBg   = isDark ? '#1C2128'              : '#FFFFFF';
  const textPri  = isDark ? '#F8F9FA'              : '#212529';
  const textSec  = isDark ? '#8A9BB0'              : '#6C757D';
  const inputBg  = isDark ? 'rgba(255,255,255,0.06)' : '#F8F9FA';
  const inputBdr = isDark ? 'rgba(255,255,255,0.12)' : '#E9ECEF';
  const labelClr = isDark ? '#ADB5BD'              : '#495057';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: bg,
      fontFamily: 'Inter, -apple-system, sans-serif',
      overflowY: 'auto', overflowX: 'hidden',
      WebkitOverflowScrolling: 'touch',
      zIndex: 50,
    }}>
      <style>{`
        @keyframes auth-spin { to { transform: rotate(360deg); } }
        @keyframes auth-slide-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .auth-slide-up { animation: auth-slide-up 0.35s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div style={{
        maxWidth: 460, margin: '0 auto', minHeight: '100vh',
        padding: '48px 24px 56px', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{
          background: cardBg, borderRadius: 28, padding: '40px 32px',
          boxShadow: isDark ? '0 8px 48px rgba(0,0,0,0.6)' : '0 8px 48px rgba(0,0,0,0.1)',
          border: isDark ? '1px solid rgba(255,255,255,0.07)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 13,
              background: 'linear-gradient(135deg, #FFC107, #E6A800)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(255,193,7,0.4)',
            }}>
              <span style={{ fontSize: 20 }}>🚌</span>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: textPri, margin: 0 }}>SmartRoutes</p>
              <p style={{ fontSize: 11, color: textSec, margin: 0 }}>Definir nova senha</p>
            </div>
          </div>

          {linkValido === null ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: textSec }}>
              <Spinner />
              <span style={{ marginLeft: 10, fontSize: 14 }}>Verificando link...</span>
            </div>
          ) : !linkValido ? (
            <div className="auth-slide-up" style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(220,53,69,0.12)',
                border: '2px solid rgba(220,53,69,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px',
              }}>
                <AlertCircle size={36} color="#DC3545" strokeWidth={2} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: textPri, margin: '0 0 8px' }}>
                Link inválido ou expirado
              </h2>
              <p style={{ fontSize: 14, color: textSec, margin: '0 0 24px', lineHeight: 1.6 }}>
                Esse link de redefinição não é mais válido. Solicite um novo
                link na tela de login.
              </p>
              <button type="button" onClick={() => window.location.replace('/')}
                style={{
                  width: '100%', background: '#FFC107', color: '#212529',
                  border: 'none', borderRadius: 16, padding: '14px 24px',
                  fontSize: 15, fontWeight: 800, fontFamily: 'Inter, sans-serif',
                  cursor: 'pointer', minHeight: 52,
                  boxShadow: '0 4px 20px rgba(255,193,7,0.4)',
                }}>
                Voltar para o login
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: textPri, margin: '0 0 6px', letterSpacing: -0.3 }}>
                Criar nova senha
              </h2>
              <p style={{ fontSize: 14, color: textSec, margin: '0 0 24px', lineHeight: 1.55 }}>
                Escolha uma senha com pelo menos 6 caracteres. Depois você usa
                a nova senha para entrar.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                {erro && (
                  <div className="auth-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(220,53,69,0.15)' : '#FFF5F5', border: `1.5px solid ${isDark ? 'rgba(220,53,69,0.4)' : '#DC3545'}`, borderRadius: 14, padding: '13px 16px', marginBottom: 20 }}>
                    <AlertCircle size={18} color="#DC3545" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: '#DC3545', fontWeight: 600, margin: 0 }}>{erro}</p>
                  </div>
                )}

                {/* Nova senha */}
                <div style={{ marginBottom: 18 }}>
                  <label htmlFor="reset-pw" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: labelClr, marginBottom: 8 }}>
                    Nova senha
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} color={textSec} strokeWidth={2}
                      style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      id="reset-pw"
                      type={mostrarSenha ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={senha}
                      onChange={e => { setSenha(e.target.value); setErro(''); }}
                      autoComplete="new-password"
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: inputBg, border: `2px solid ${inputBdr}`,
                        borderRadius: 14, padding: '14px 52px 14px 46px',
                        fontSize: 15, fontFamily: 'Inter, sans-serif',
                        color: textPri, outline: 'none', minHeight: 52,
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#FFC107'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255,193,7,0.18)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = inputBdr; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    <button type="button" onClick={() => setMostrarSenha(v => !v)}
                      aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, padding: 0 }}>
                      {mostrarSenha
                        ? <EyeOff size={20} color={textSec} strokeWidth={2} />
                        : <Eye    size={20} color={textSec} strokeWidth={2} />}
                    </button>
                  </div>
                </div>

                {/* Confirmar nova senha */}
                <div style={{ marginBottom: 18 }}>
                  <label htmlFor="reset-pw-confirm" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: labelClr, marginBottom: 8 }}>
                    Confirmar nova senha
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} color={textSec} strokeWidth={2}
                      style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      id="reset-pw-confirm"
                      type={mostrarConfirm ? 'text' : 'password'}
                      placeholder="Repita a nova senha"
                      value={confirmar}
                      onChange={e => { setConfirmar(e.target.value); setErro(''); }}
                      autoComplete="new-password"
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: inputBg, border: `2px solid ${inputBdr}`,
                        borderRadius: 14, padding: '14px 52px 14px 46px',
                        fontSize: 15, fontFamily: 'Inter, sans-serif',
                        color: textPri, outline: 'none', minHeight: 52,
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#FFC107'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255,193,7,0.18)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = inputBdr; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    <button type="button" onClick={() => setMostrarConfirm(v => !v)}
                      aria-label={mostrarConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, padding: 0 }}>
                      {mostrarConfirm
                        ? <EyeOff size={20} color={textSec} strokeWidth={2} />
                        : <Eye    size={20} color={textSec} strokeWidth={2} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    background: loading ? 'rgba(255,193,7,0.7)' : '#FFC107', color: '#212529',
                    border: 'none', borderRadius: 16, padding: '16px 24px',
                    fontSize: 16, fontWeight: 800, fontFamily: 'Inter, sans-serif',
                    cursor: loading ? 'not-allowed' : 'pointer', minHeight: 56,
                    boxShadow: '0 4px 20px rgba(255,193,7,0.4)',
                    transition: 'all 0.2s', letterSpacing: 0.2, marginTop: 8,
                  }}>
                  {loading
                    ? <><Spinner /><span>Salvando...</span></>
                    : <><span>Redefinir senha</span><ArrowRight size={18} strokeWidth={2.5} /></>}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: isDark ? 'rgba(255,255,255,0.18)' : '#CED4DA', marginTop: 20, marginBottom: 0 }}>
          SmartRoutes v{APP_VERSION} · © {new Date().getFullYear()} Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
