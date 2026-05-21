import { useState } from 'react';
import { ArrowLeft, ArrowRight, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { APP_VERSION } from '../utils/appVersion';

interface ForgotPasswordScreenProps {
  onGoLogin: () => void;
}

function Spinner() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={3} strokeLinecap="round"
      style={{ animation: 'auth-spin 0.75s linear infinite', flexShrink: 0 }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

export function ForgotPasswordScreen({ onGoLogin }: ForgotPasswordScreenProps) {
  const { isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Por favor, insira seu e-mail.'); return; }

    setLoading(true);
    // Mensagem genérica por segurança: não vazamos se o e-mail existe ou não.
    // Mesmo se o Supabase retornar erro (rate limit, e-mail inválido), mostramos
    // o estado de sucesso — única exceção é quando a chamada nem chegou (rede off).
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/redefinir-senha',
      });
      setSent(true);
    } catch {
      setError('Não foi possível enviar o link agora. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
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
        {/* Botão voltar */}
        <button type="button" onClick={onGoLogin}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, color: textSec,
            padding: '8px 0', marginBottom: 16, alignSelf: 'flex-start',
            minHeight: 36,
          }}>
          <ArrowLeft size={16} strokeWidth={2.2} />
          Voltar para o login
        </button>

        {/* Card */}
        <div style={{
          background: cardBg, borderRadius: 28, padding: '40px 32px',
          boxShadow: isDark ? '0 8px 48px rgba(0,0,0,0.6)' : '0 8px 48px rgba(0,0,0,0.1)',
          border: isDark ? '1px solid rgba(255,255,255,0.07)' : 'none',
        }}>
          {/* Logo */}
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
              <p style={{ fontSize: 11, color: textSec, margin: 0 }}>Recuperar acesso</p>
            </div>
          </div>

          {sent ? (
            <div className="auth-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, padding: '12px 0' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(25,135,84,0.12)',
                border: '2px solid rgba(25,135,84,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 16px rgba(25,135,84,0.06)',
              }}>
                <CheckCircle2 size={40} color="#198754" strokeWidth={2} />
              </div>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: textPri, margin: '0 0 8px' }}>
                  Link enviado!
                </h2>
                <p style={{ fontSize: 14, color: textSec, margin: 0, lineHeight: 1.6 }}>
                  Se esse e-mail estiver cadastrado, você receberá o link de
                  redefinição em breve. Verifique sua caixa de entrada
                  e a pasta de spam.
                </p>
              </div>
              <button type="button" onClick={onGoLogin}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: '#FFC107', color: '#212529',
                  border: 'none', borderRadius: 16, padding: '14px 24px',
                  fontSize: 15, fontWeight: 800, fontFamily: 'Inter, sans-serif',
                  cursor: 'pointer', minHeight: 52,
                  boxShadow: '0 4px 20px rgba(255,193,7,0.4)',
                  marginTop: 8,
                }}>
                Voltar para o login
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: textPri, margin: '0 0 6px', letterSpacing: -0.3 }}>
                Esqueceu sua senha?
              </h2>
              <p style={{ fontSize: 14, color: textSec, margin: '0 0 28px', lineHeight: 1.55 }}>
                Sem problema. Informe seu e-mail cadastrado e enviaremos um link
                para você criar uma nova senha.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                {error && (
                  <div className="auth-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(220,53,69,0.15)' : '#FFF5F5', border: `1.5px solid ${isDark ? 'rgba(220,53,69,0.4)' : '#DC3545'}`, borderRadius: 14, padding: '13px 16px', marginBottom: 20 }}>
                    <AlertCircle size={18} color="#DC3545" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: '#DC3545', fontWeight: 600, margin: 0 }}>{error}</p>
                  </div>
                )}

                <div style={{ marginBottom: 24 }}>
                  <label htmlFor="forgot-email" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: labelClr, marginBottom: 8 }}>
                    E-mail
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} color={textSec} strokeWidth={2}
                      style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      id="forgot-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      autoComplete="email"
                      inputMode="email"
                      autoFocus
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: inputBg, border: `2px solid ${error ? '#DC3545' : inputBdr}`,
                        borderRadius: 14, padding: '14px 16px 14px 46px',
                        fontSize: 15, fontFamily: 'Inter, sans-serif',
                        color: textPri, outline: 'none', minHeight: 52,
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#FFC107'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255,193,7,0.18)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = error ? '#DC3545' : inputBdr; e.currentTarget.style.boxShadow = 'none'; }}
                    />
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
                    transition: 'all 0.2s', letterSpacing: 0.2,
                  }}>
                  {loading
                    ? <><Spinner /><span>Enviando...</span></>
                    : <><span>Enviar link</span><ArrowRight size={18} strokeWidth={2.5} /></>}
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
