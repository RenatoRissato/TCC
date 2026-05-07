import { useState } from 'react';
import {
  Eye, EyeOff, ArrowRight, AlertCircle,
  MapPin, MessageCircle, BarChart3, Shield,
  CheckCircle2, Star,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useBreakpoints } from '../hooks/useWindowSize';

/* ─── Spinner ──────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={3} strokeLinecap="round"
      style={{ animation: 'auth-spin 0.75s linear infinite', flexShrink: 0 }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

/* ─── Brand / Left panel ───────────────────────────────────────────── */
function BrandPanel({ onToggleView }: { onToggleView: () => void }) {
  const features = [
    { Icon: MessageCircle, color: '#25D366', label: 'Bot WhatsApp automático', desc: 'Pais confirmam presença com 1 mensagem' },
    { Icon: MapPin,        color: '#FFC107', label: 'Rotas inteligentes',      desc: 'Organize manhã, tarde e noite em segundos' },
    { Icon: BarChart3,     color: '#60A5FA', label: 'Dashboard em tempo real', desc: 'Saiba quem vai e quem não vai hoje' },
    { Icon: Shield,        color: '#A78BFA', label: 'Seguro e confiável',      desc: 'Dados protegidos com criptografia' },
  ];

  return (
    /*
     * LEFT PANEL — 3-zone space-between flex column
     * ─────────────────────────────────────────────────────────────────
     * • height: 100vh        → explicit viewport height (never auto/%)
     * • overflow: hidden     → clips any content that would push past edge
     * • justify-content:     → space-between distributes 3 zones:
     *   space-between          [1] logo header  [2] main copy  [3] social proof
     * • padding: 48px 52px  → ≈ Bootstrap p-5; keeps all zones off edges
     * ─────────────────────────────────────────────────────────────────
     */
    <div style={{
      height: '100vh',          /* explicit — not auto, not minHeight, not flex:1 */
      overflow: 'hidden',       /* nothing bleeds past viewport edges             */
      background: 'linear-gradient(155deg, #0A0D12 0%, #111318 50%, #0D1117 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between', /* logo top · copy middle · social bottom  */
      padding: '48px 52px',     /* ≈ Bootstrap p-5 — generous edge clearance      */
      position: 'relative',
      boxSizing: 'border-box',
    }}>
      {/* Geometric dot grid pattern */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none' }}
        xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#FFC107" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* Glow orbs */}
      <div style={{ position: 'absolute', top: -120, left: -120, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,193,7,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

      {/* ── ZONE 1: Logo header — always pinned to top padding ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 17,
          background: 'linear-gradient(135deg, #FFC107 0%, #E6A800 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 28px rgba(255,193,7,0.4)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 26 }}>🚌</span>
        </div>
        <div>
          <p style={{ fontSize: 21, fontWeight: 900, color: '#FFC107', margin: 0, letterSpacing: -0.5 }}>SmartRoutes</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0, letterSpacing: 0.3 }}>Gestão Escolar · SaaS PWA</p>
        </div>
      </div>

      {/* ── ZONE 2: Main marketing copy — vertically centred by space-between ── */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {/* Live badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,193,7,0.12)', border: '1px solid rgba(255,193,7,0.25)', borderRadius: 20, padding: '5px 12px', marginBottom: 18 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', animation: 'auth-pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#FFC107', letterSpacing: 1.2, textTransform: 'uppercase' }}>Automatize sua van escolar</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1.18, margin: '0 0 14px', letterSpacing: -0.8 }}>
          Confirmações<br />
          automáticas via<br />
          <span style={{ color: '#FFC107' }}>WhatsApp.</span>
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', margin: '0 0 28px', lineHeight: 1.7, maxWidth: 360 }}>
          Pais confirmam a presença dos alunos com uma mensagem.
          O SmartRoutes organiza sua rota automaticamente — sem ligações, sem planilhas.
        </p>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
          {features.map(({ Icon, color, label, desc }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={17} color={color} strokeWidth={2} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: 0 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ZONE 3: Social proof + register link — always pinned to bottom padding ── */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 20 }} />

        {/* Avatars + stars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex' }}>
            {['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7'].map((c, i) => (
              <div key={c} style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: '2px solid #0A0D12', marginLeft: i > 0 ? -9 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {['C','M','R','A','L'][i]}
              </div>
            ))}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
              {[1,2,3,4,5].map(s => <Star key={s} size={11} color="#FFC107" fill="#FFC107" />)}
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
              <strong style={{ color: '#fff' }}>+1.200 motoristas</strong> confiam no SmartRoutes
            </p>
          </div>
        </div>

        {/* Register CTA */}
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Não tem uma conta?{' '}
          <button type="button" onClick={onToggleView}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#FFC107', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            Criar conta grátis →
          </button>
        </p>
      </div>
    </div>
  );
}

/* ─── Main Login Screen ────────────────────────────────────────────── */
interface LoginScreenProps { onGoRegister: () => void; }

export function LoginScreen({ onGoRegister }: LoginScreenProps) {
  const { login }      = useAuth();
  const { isDark }     = useTheme();
  const { isMobile }   = useBreakpoints();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim())    { setError('Por favor, insira seu e-mail.'); return; }
    if (!password.trim()) { setError('Por favor, insira sua senha.'); return; }
    setLoading(true);
    const result = await login(email, password);
    if (!result.ok) setError(result.errorMessage ?? 'Não foi possível entrar. Tente novamente.');
    setLoading(false);
  };

  /* colour tokens — respects light / dark mode */
  const bg       = isDark ? '#0F1117'              : '#F0F2F5';
  const cardBg   = isDark ? '#1C2128'              : '#FFFFFF';
  const textPri  = isDark ? '#F8F9FA'              : '#212529';
  const textSec  = isDark ? '#8A9BB0'              : '#6C757D';
  const inputBg  = isDark ? 'rgba(255,255,255,0.06)' : '#F8F9FA';
  const inputBdr = isDark ? 'rgba(255,255,255,0.12)' : '#E9ECEF';
  const divider  = isDark ? 'rgba(255,255,255,0.08)'  : '#E9ECEF';
  const labelClr = isDark ? '#ADB5BD'              : '#495057';

  /* ── shared form ──────────────────────────────────────────── */
  const Form = (
    <form onSubmit={handleLogin} noValidate style={{ width: '100%' }}>
      {/* Error */}
      {error && (
        <div className="auth-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(220,53,69,0.15)' : '#FFF5F5', border: `1.5px solid ${isDark ? 'rgba(220,53,69,0.4)' : '#DC3545'}`, borderRadius: 14, padding: '13px 16px', marginBottom: 22 }}>
          <AlertCircle size={18} color="#DC3545" strokeWidth={2.5} style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#DC3545', fontWeight: 600, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Email */}
      <div style={{ marginBottom: 18 }}>
        <label htmlFor="login-email" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: labelClr, marginBottom: 8, letterSpacing: 0.1 }}>
          E-mail
        </label>
        <input
          id="login-email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }}
          autoComplete="email"
          inputMode="email"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: inputBg, border: `2px solid ${error && !email ? '#DC3545' : inputBdr}`,
            borderRadius: 14, padding: '14px 16px',
            fontSize: 15, fontFamily: 'Inter, sans-serif',
            color: textPri, outline: 'none', minHeight: 52,
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#FFC107'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255,193,7,0.18)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = (error && !email) ? '#DC3545' : inputBdr; e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Password */}
      <div style={{ marginBottom: 10 }}>
        <label htmlFor="login-pw" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: labelClr, marginBottom: 8 }}>
          Senha
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="login-pw"
            type={showPwd ? 'text' : 'password'}
            placeholder="Sua senha"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            autoComplete="current-password"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: inputBg, border: `2px solid ${error && !password ? '#DC3545' : inputBdr}`,
              borderRadius: 14, padding: '14px 52px 14px 16px',
              fontSize: 15, fontFamily: 'Inter, sans-serif',
              color: textPri, outline: 'none', minHeight: 52,
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#FFC107'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255,193,7,0.18)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = (error && !password) ? '#DC3545' : inputBdr; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <button type="button" onClick={() => setShowPwd(v => !v)}
            aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, padding: 0 }}>
            {showPwd
              ? <EyeOff size={20} color={textSec} strokeWidth={2} />
              : <Eye    size={20} color={textSec} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {/* Forgot */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
        <button type="button"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#FFC107', padding: '6px 0', minHeight: 36 }}>
          Esqueceu a senha?
        </button>
      </div>

      {/* Submit */}
      <button type="submit" disabled={loading}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: loading ? 'rgba(255,193,7,0.7)' : '#FFC107', color: '#212529',
          border: 'none', borderRadius: 16, padding: '16px 24px',
          fontSize: 16, fontWeight: 800, fontFamily: 'Inter, sans-serif',
          cursor: loading ? 'not-allowed' : 'pointer', minHeight: 56,
          boxShadow: '0 4px 20px rgba(255,193,7,0.4)',
          transition: 'all 0.2s', letterSpacing: 0.2,
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(255,193,7,0.55)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(255,193,7,0.4)'; }}>
        {loading ? <><Spinner /><span>Entrando...</span></> : <><span>Entrar</span><ArrowRight size={18} strokeWidth={2.5} /></>}
      </button>
    </form>
  );

  /* ── Divider + Google + Footer ────────────────────────────── */
  const Footer = (
    <>
      <p style={{ textAlign: 'center', fontSize: 14, color: textSec, marginTop: 28, marginBottom: 0 }}>
        Não tem uma conta?{' '}
        <button type="button" onClick={onGoRegister}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#FFC107', padding: 0, minHeight: 36 }}>
          Criar conta
        </button>
      </p>
    </>
  );

  /* ── MOBILE layout ──────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{ width: '100%', maxWidth: 480, height: '100dvh', display: 'flex', flexDirection: 'column', background: bg, fontFamily: 'Inter, -apple-system, sans-serif', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', position: 'relative' }}>
        <style>{`
          @keyframes auth-spin { to { transform: rotate(360deg); } }
          @keyframes auth-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
          @keyframes auth-slide-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
          .auth-slide-up { animation: auth-slide-up 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        `}</style>

        {/* Glow */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, background: 'radial-gradient(circle, rgba(255,193,7,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Hero — agora parte do fluxo normal, rola junto com o conteúdo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 64, paddingBottom: 36, position: 'relative', zIndex: 1, background: '#0F1117' }}>
          <div style={{ width: 84, height: 84, background: 'linear-gradient(135deg, #FFC107 0%, #E6A800 100%)', borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 36px rgba(255,193,7,0.45)', marginBottom: 20 }}>
            <span style={{ fontSize: 40 }}>🚌</span>
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: '#fff', letterSpacing: -0.8, margin: 0, lineHeight: 1 }}>
            Smart<span style={{ color: '#FFC107' }}>Routes</span>
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginTop: 8, marginBottom: 0 }}>
            Rotas escolares inteligentes
          </p>
        </div>

        {/* Card — flexShrink:0 para não comprimir em telas pequenas */}
        <div style={{ flex: 1, flexShrink: 0, background: isDark ? '#1C2128' : '#fff', borderRadius: '28px 28px 0 0', padding: '32px 24px 48px', boxShadow: '0 -12px 48px rgba(0,0,0,0.35)', position: 'relative', zIndex: 2 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: textPri, margin: '0 0 4px' }}>
            Bem-vindo de volta! 👋
          </h2>
          <p style={{ fontSize: 14, color: textSec, margin: '0 0 28px', fontWeight: 400 }}>
            Entre na sua conta para continuar
          </p>
          {Form}
          {Footer}
          <p style={{ textAlign: 'center', fontSize: 11, color: isDark ? 'rgba(255,255,255,0.15)' : '#CED4DA', marginTop: 24, marginBottom: 0 }}>
            SmartRoutes v3.0 · Todos os direitos reservados
          </p>
        </div>
      </div>
    );
  }

  /* ── DESKTOP / TABLET — Split Screen layout ───────────────── */
  return (
    /*
     * DESKTOP SPLIT-SCREEN WRAPPER
     * ─────────────────────────────────────────────────────────────────────
     * • position:fixed + inset:0   → covers full viewport, escapes #root frame
     * • display:grid               → implicit 100vh row height for BOTH columns;
     *                                more reliable than flex % height resolution
     * • grid-template-columns      → left col is fluid (1fr), right is capped
     * ─────────────────────────────────────────────────────────────────────
     */
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'grid',
      gridTemplateColumns: '1fr minmax(420px, 48%)',
      fontFamily: 'Inter, -apple-system, sans-serif',
      zIndex: 50,
    }}>
      <style>{`
        @keyframes auth-spin { to { transform: rotate(360deg); } }
        @keyframes auth-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        @keyframes auth-slide-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .auth-slide-up { animation: auth-slide-up 0.35s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {/* ── LEFT: Brand panel — naturally 100vh from CSS Grid row, overflow hidden ── */}
      <BrandPanel onToggleView={onGoRegister} />

      {/* ── RIGHT: Form panel ────────────────────────────────────────────────────
            FIX A — height: 100vh (explicit viewport unit, NOT '100%')
                     '100%' can fail when the percentage chain is ambiguous in
                     certain renderers; 100vh is always unambiguous.
            FIX B — overflowY: 'auto' makes THIS column the scroll container.
                     The left panel and the page body never scroll.
            FIX C — NO flex centering (alignItems/justifyContent) on this div.
                     Flex-center + overflow:auto pushes content above y=0,
                     making the top unreachable (the original clipping bug).
            FIX D — Horizontal centering lives on the INNER wrapper via
                     margin:'0 auto', not on this container.
            FIX E — paddingTop on the inner wrapper (≈ Bootstrap pt-5 / 3rem)
                     ensures the logo/title start safely below the viewport edge.
      ──────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          height: '100vh',         /* ← explicit viewport height — never ambiguous */
          overflowY: 'auto',       /* ← isolated scroll pane; left col stays fixed */
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          background: bg,
          /* NO padding, NO flex alignment — both live on the inner wrapper */
        }}
      >
        {/* Inner wrapper — top-padded + horizontally centered via margin:auto */}
        <div
          style={{
            maxWidth: 420,
            minHeight: '100vh',
            margin: '0 auto',           /* horizontal centering — no flex tricks */
            padding: '48px 32px 56px',  /* pt≈3rem keeps logo clear of viewport top */
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {/* Card */}
          <div style={{ background: cardBg, borderRadius: 28, padding: '44px 40px', boxShadow: isDark ? '0 8px 48px rgba(0,0,0,0.6)' : '0 8px 48px rgba(0,0,0,0.1)', border: isDark ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            {/* Logo row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
              <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg, #FFC107, #E6A800)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(255,193,7,0.4)' }}>
                <span style={{ fontSize: 20 }}>🚌</span>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: textPri, margin: 0 }}>SmartRoutes</p>
                <p style={{ fontSize: 11, color: textSec, margin: 0 }}>Faça login para continuar</p>
              </div>
            </div>

            <h2 style={{ fontSize: 26, fontWeight: 800, color: textPri, margin: '0 0 6px', letterSpacing: -0.3 }}>
              Bem-vindo de volta 👋
            </h2>
            <p style={{ fontSize: 14, color: textSec, margin: '0 0 32px', fontWeight: 400 }}>
              Entre com seu e-mail e senha para acessar o painel
            </p>

            {Form}
            {Footer}
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: isDark ? 'rgba(255,255,255,0.18)' : '#CED4DA', marginTop: 20, marginBottom: 0 }}>
            SmartRoutes v3.0 · © 2026 Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
