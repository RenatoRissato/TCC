import { useState } from 'react';
import {
  ArrowLeft, Eye, EyeOff, User, Mail, Phone, Lock,
  CheckCircle2, AlertCircle, ArrowRight, X,
  Zap, Clock, Users, BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useBreakpoints } from '../hooks/useWindowSize';

interface RegisterScreenProps { onGoLogin: () => void; }
interface FormState { name: string; email: string; phone: string; password: string; confirm: string; }
interface FormErrors { name?: string; email?: string; phone?: string; password?: string; confirm?: string; }

/* ─── Password strength bar ────────────────────────────────────────── */
function StrengthBar({ password }: { password: string }) {
  const score = Math.min(
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0), 4
  );
  const colors = ['#E9ECEF', '#DC3545', '#FD7E14', '#FFC107', '#198754'];
  const labels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  if (!password) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= score ? colors[score] : '#E9ECEF', transition: 'background 0.3s' }} />
        ))}
      </div>
      <p style={{ fontSize: 11, color: colors[score], fontWeight: 600, margin: 0 }}>
        Força da senha: {labels[score]}
      </p>
    </div>
  );
}

/* ─── Spinner ──────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"
      style={{ animation: 'auth-spin 0.75s linear infinite', flexShrink: 0 }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

/* ─── Country code picker ──────────────────────────────────────────── */
const COUNTRY_CODES = [
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+1',  flag: '🇺🇸', name: 'EUA' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+54',  flag: '🇦🇷', name: 'Argentina' },
  { code: '+52',  flag: '🇲🇽', name: 'México' },
];

/* Aplica máscara brasileira: (DD) XXXXX-XXXX  ou  (DD) XXXX-XXXX */
function formatarTelefoneBR(input: string): string {
  const dig = input.replace(/\D/g, '').slice(0, 11);
  if (dig.length === 0) return '';
  if (dig.length <= 2) return `(${dig}`;
  if (dig.length <= 6) return `(${dig.slice(0, 2)}) ${dig.slice(2)}`;
  if (dig.length <= 10) return `(${dig.slice(0, 2)}) ${dig.slice(2, 6)}-${dig.slice(6)}`;
  return `(${dig.slice(0, 2)}) ${dig.slice(2, 7)}-${dig.slice(7)}`;
}

/* ─── InputField (top-level — não recriar a cada render!) ─────────── */
interface InputFieldProps {
  id: string;
  type?: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  rightEl?: React.ReactNode;
  inputBg: string;
  inputBdr: string;
  textPri: string;
  labelClr: string;
}

function InputField({
  id, type = 'text', label, placeholder, value, onChange, error,
  autoComplete, inputMode, rightEl, inputBg, inputBdr, textPri, labelClr,
}: InputFieldProps) {
  return (
    <div style={{ marginBottom: error ? 6 : 16 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 13, fontWeight: 700, color: labelClr, marginBottom: 8 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id} type={type} placeholder={placeholder} value={value}
          onChange={onChange} autoComplete={autoComplete} inputMode={inputMode}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: inputBg, border: `2px solid ${error ? '#DC3545' : inputBdr}`,
            borderRadius: 14, padding: rightEl ? '14px 52px 14px 16px' : '14px 16px',
            fontSize: 15, fontFamily: 'Inter, sans-serif', color: textPri,
            outline: 'none', minHeight: 52, transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#FFC107'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255,193,7,0.18)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = error ? '#DC3545' : inputBdr; e.currentTarget.style.boxShadow = 'none'; }}
        />
        {rightEl && (
          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
            {rightEl}
          </div>
        )}
      </div>
      {error && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#DC3545', fontWeight: 600, margin: '6px 0 8px' }}>
          <AlertCircle size={12} strokeWidth={2.5} /> {error}
        </p>
      )}
    </div>
  );
}

function EyeBtn({ show, onClick, color }: { show: boolean; onClick: () => void; color: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, padding: 0 }}
      aria-label={show ? 'Ocultar' : 'Mostrar'}
    >
      {show ? <EyeOff size={20} color={color} strokeWidth={2} /> : <Eye size={20} color={color} strokeWidth={2} />}
    </button>
  );
}

function PhoneInput({ value, onChange, error, inputBg, inputBdr, textPri, textSec }: {
  value: string; onChange: (v: string) => void; error?: string;
  inputBg: string; inputBdr: string; textPri: string; textSec: string;
}) {
  const [countryCode, setCountryCode] = useState('+55');
  const borderColor = error ? '#DC3545' : inputBdr;

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {/* Country picker */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <select
          value={countryCode}
          onChange={e => setCountryCode(e.target.value)}
          style={{
            appearance: 'none', WebkitAppearance: 'none',
            background: inputBg, border: `2px solid ${borderColor}`,
            borderRadius: 14, padding: '0 32px 0 12px',
            fontSize: 14, fontFamily: 'Inter, sans-serif',
            color: textPri, outline: 'none', cursor: 'pointer',
            minHeight: 52, height: '100%', width: 90,
            transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#FFC107'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255,193,7,0.18)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.boxShadow = 'none'; }}>
          {COUNTRY_CODES.map(c => (
            <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
          ))}
        </select>
        <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={textSec} strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
      {/* Number field */}
      <input
        type="tel"
        placeholder="(11) 99999-0000"
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete="tel"
        inputMode="tel"
        style={{
          flex: 1, boxSizing: 'border-box',
          background: inputBg, border: `2px solid ${borderColor}`,
          borderRadius: 14, padding: '14px 16px',
          fontSize: 15, fontFamily: 'Inter, sans-serif',
          color: textPri, outline: 'none', minHeight: 52,
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#FFC107'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255,193,7,0.18)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

/* ─── Right / Brand panel for register ────────────────────────────── */
function RegisterBrandPanel({ onGoLogin }: { onGoLogin: () => void }) {
  const perks = [
    { Icon: Zap,        color: '#FFC107', title: 'Setup em 5 minutos',      desc: 'Configure o bot e comece a usar hoje mesmo' },
    { Icon: Clock,      color: '#60A5FA', title: 'Automatize seu dia',       desc: 'Mensagens agendadas 1 dia antes da rota' },
    { Icon: Users,      color: '#4ADE80', title: 'Gerencie todos os alunos', desc: 'Cadastro completo com turnos e endereços' },
    { Icon: BarChart3,  color: '#A78BFA', title: 'Relatórios semanais',      desc: 'Acompanhe taxa de presença e ausências' },
  ];

  return (
    /*
     * LEFT PANEL — 3-zone space-between flex column
     * ─────────────────────────────────────────────────────────────────
     * • height: 100vh          → explicit viewport height (never auto/%)
     * • overflow: hidden       → clips content at viewport boundary
     * • justify-content:       → space-between: logo top · copy middle · footer bottom
     *   space-between
     * • padding: 48px 52px    → ≈ Bootstrap p-5; all zones clear of edges
     * • boxSizing: border-box → padding doesn't add to 100vh
     * ─────────────────────────────────────────────────────────────────
     */
    <div style={{
      height: '100vh',           /* explicit — not auto, not minHeight, not flex:1 */
      overflow: 'hidden',        /* nothing bleeds past viewport edges              */
      background: 'linear-gradient(155deg, #0A0D12 0%, #0F1318 50%, #0D1117 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between', /* logo top · perks middle · login link bottom */
      padding: '48px 52px',      /* ≈ Bootstrap p-5 — generous edge clearance        */
      position: 'relative',
      boxSizing: 'border-box',
    }}>
      {/* Pattern */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots2" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#FFC107" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots2)" />
      </svg>

      {/* Orbs */}
      <div style={{ position: 'absolute', top: -100, right: -100, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,193,7,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,222,128,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />

      {/* ── ZONE 1: Logo — always pinned to top padding ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 52, height: 52, borderRadius: 17, background: 'linear-gradient(135deg, #FFC107 0%, #E6A800 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 28px rgba(255,193,7,0.4)', flexShrink: 0 }}>
          <span style={{ fontSize: 26 }}>🚌</span>
        </div>
        <div>
          <p style={{ fontSize: 21, fontWeight: 900, color: '#FFC107', margin: 0, letterSpacing: -0.5 }}>SmartRoutes</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Gestão Escolar · SaaS PWA</p>
        </div>
      </div>

      {/* ── ZONE 2: Main copy — vertically centred by space-between ── */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '5px 12px', marginBottom: 18 }}>
          <CheckCircle2 size={13} color="#4ADE80" strokeWidth={2.5} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4ADE80', letterSpacing: 1.2, textTransform: 'uppercase' }}>Grátis para começar</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 34, fontWeight: 900, color: '#fff', lineHeight: 1.18, margin: '0 0 14px', letterSpacing: -0.8 }}>
          Crie sua conta<br />
          em menos de<br />
          <span style={{ color: '#FFC107' }}>2 minutos.</span>
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 24px', lineHeight: 1.7, maxWidth: 340 }}>
          Você só precisa do seu WhatsApp para ativar o bot automático de confirmações de presença.
        </p>

        {/* Perks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13, position: 'relative' }}>
          {perks.map(({ Icon, color, title, desc }) => (
            <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={17} color={color} strokeWidth={2} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>{title}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: 0 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ZONE 3: Login link — always pinned to bottom padding ── */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 20 }} />
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Já tem uma conta?{' '}
          <button type="button" onClick={onGoLogin}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#FFC107', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            Fazer login →
          </button>
        </p>
      </div>
    </div>
  );
}

/* ─── "Confirme seu e-mail" screen ────────────────────────────────── */
function ConfirmEmailState({ email, isDark, isMobile, onGoLogin }: { email: string; isDark: boolean; isMobile: boolean; onGoLogin: () => void }) {
  const textPri = isDark ? '#F8F9FA' : '#212529';
  const textSec = isDark ? '#8A9BB0' : '#6C757D';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 40, gap: 22, textAlign: 'center' }}>
      <div className="auth-slide-up" style={{ width: 96, height: 96, background: 'rgba(41,121,255,0.12)', border: '2px solid rgba(41,121,255,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 20px rgba(41,121,255,0.06)' }}>
        <span style={{ fontSize: 44 }}>📧</span>
      </div>
      <div className="auth-slide-up" style={{ animationDelay: '0.08s' }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: isMobile ? '#fff' : textPri, margin: '0 0 8px' }}>Confirme seu e-mail</h2>
        <p style={{ fontSize: 14, color: isMobile ? 'rgba(255,255,255,0.55)' : textSec, margin: 0, lineHeight: 1.6 }}>
          Enviamos um link de confirmação para
          <br />
          <strong style={{ color: '#FFC107', wordBreak: 'break-all' }}>{email}</strong>
        </p>
      </div>
      <div className="auth-slide-up" style={{ animationDelay: '0.16s', background: isDark ? 'rgba(255,193,7,0.08)' : 'rgba(255,193,7,0.1)', border: `1px solid rgba(255,193,7,0.25)`, borderRadius: 12, padding: '12px 14px', maxWidth: 360 }}>
        <p style={{ fontSize: 12, color: isMobile ? 'rgba(255,255,255,0.7)' : textSec, margin: 0, lineHeight: 1.55 }}>
          Abra o link recebido para ativar sua conta.
          Depois, volte aqui e faça login para concluir o cadastro do seu perfil de motorista.
        </p>
      </div>
      <button
        type="button"
        onClick={onGoLogin}
        className="auth-slide-up"
        style={{
          animationDelay: '0.24s',
          background: '#FFC107', color: '#212529',
          border: 'none', borderRadius: 14, padding: '12px 28px',
          fontSize: 14, fontWeight: 800, fontFamily: 'Inter, sans-serif',
          cursor: 'pointer', minHeight: 48,
          boxShadow: '0 4px 16px rgba(255,193,7,0.4)',
        }}
      >
        Ir para o login
      </button>
    </div>
  );
}

/* ─── Success screen ───────────────────────────────────────────────── */
function SuccessState({ name, isDark, isMobile, onGoLogin }: { name: string; isDark: boolean; isMobile: boolean; onGoLogin: () => void }) {
  const textPri = isDark ? '#F8F9FA' : '#212529';
  const textSec = isDark ? '#8A9BB0' : '#6C757D';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 40, gap: 24, textAlign: 'center' }}>
      <div className="auth-slide-up" style={{ width: 96, height: 96, background: 'rgba(25,135,84,0.12)', border: '2px solid rgba(25,135,84,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 20px rgba(25,135,84,0.06)' }}>
        <CheckCircle2 size={48} color="#198754" strokeWidth={2} />
      </div>
      <div className="auth-slide-up" style={{ animationDelay: '0.08s' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: isMobile ? '#fff' : textPri, margin: '0 0 8px' }}>Conta criada! 🎉</h2>
        <p style={{ fontSize: 15, color: isMobile ? 'rgba(255,255,255,0.55)' : textSec, margin: 0 }}>
          Bem-vindo ao SmartRoutes, <strong style={{ color: '#FFC107' }}>{name.split(' ')[0]}</strong>!
        </p>
      </div>
      <p className="auth-slide-up" style={{ animationDelay: '0.16s', fontSize: 13, color: isMobile ? 'rgba(255,255,255,0.35)' : textSec, lineHeight: 1.7, maxWidth: 280 }}>
        Sua conta foi criada com sucesso. Redirecionando para o painel...
      </p>
      <div className="auth-slide-up" style={{ animationDelay: '0.24s', display: 'flex', gap: 8 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? '#FFC107' : 'rgba(255,193,7,0.3)', animation: `auth-pulse ${1 + i * 0.15}s ease-in-out infinite` }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main Register Screen ─────────────────────────────────────────── */
export function RegisterScreen({ onGoLogin }: RegisterScreenProps) {
  const { register } = useAuth();
  const { isDark }   = useTheme();
  const { isMobile } = useBreakpoints();

  const [form,        setForm]        = useState<FormState>({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors,      setErrors]      = useState<FormErrors>({});
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [needsConfirmEmail, setNeedsConfirmEmail] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(er => ({ ...er, [field]: undefined }));
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim())              e.name     = 'Nome completo é obrigatório';
    if (!form.email.includes('@'))      e.email    = 'Insira um e-mail válido';
    if (form.phone.replace(/\D/g,'').length < 8) e.phone = 'Número de WhatsApp inválido';
    if (form.password.length < 6)      e.password = 'Senha deve ter ao menos 6 caracteres';
    if (form.password !== form.confirm) e.confirm  = 'As senhas não coincidem';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setSubmitError(null);
    const result = await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
    setLoading(false);

    if (!result.ok) {
      setSubmitError(result.errorMessage ?? 'Não foi possível criar sua conta. Tente novamente.');
      return;
    }
    if (result.needsEmailConfirmation) {
      setNeedsConfirmEmail(true);
      return;
    }
    // Sucesso com sessão imediata: o AuthGate já vai trocar pra app no próximo render.
    // O setSuccess fica como fallback visual caso o re-render demore um frame.
    setSuccess(true);
  };

  /* colour tokens */
  const bg       = isDark ? '#0F1117'               : '#F0F2F5';
  const cardBg   = isDark ? '#1C2128'               : '#FFFFFF';
  const textPri  = isDark ? '#F8F9FA'               : '#212529';
  const textSec  = isDark ? '#8A9BB0'               : '#6C757D';
  const inputBg  = isDark ? 'rgba(255,255,255,0.06)' : '#F8F9FA';
  const inputBdr = isDark ? 'rgba(255,255,255,0.12)' : '#E9ECEF';
  const labelClr = isDark ? '#ADB5BD'               : '#495057';

  /* ── Section divider ── */
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, marginTop: 4 }}>
      <div style={{ width: 3, height: 14, background: '#FFC107', borderRadius: 2 }} />
      <p style={{ fontSize: 10, fontWeight: 800, color: isDark ? '#8A9BB0' : '#6C757D', letterSpacing: 1.2, textTransform: 'uppercase', margin: 0 }}>{children}</p>
    </div>
  );

  /* InputField/EyeBtn ficam definidos no top-level do arquivo — recriá-los
     aqui dentro fazia o React desmontar/remontar o <input> a cada keypress,
     o que tirava o foco depois da primeira letra. */
  const tokens = { inputBg, inputBdr, textPri, labelClr };

  /* ── The form ── */
  const TheForm = (
    <form onSubmit={handleSubmit} noValidate>
      {/* Personal section */}
      <SectionLabel>Dados Pessoais</SectionLabel>

      <InputField {...tokens} id="reg-name" label="Nome Completo" placeholder="Ex: Carlos Andrade"
        value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />

      <InputField {...tokens} id="reg-email" type="email" label="E-mail" placeholder="seu@email.com"
        value={form.email} onChange={set('email')} error={errors.email}
        autoComplete="email" inputMode="email" />

      {/* WhatsApp with country code */}
      <div style={{ marginBottom: errors.phone ? 6 : 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: labelClr, marginBottom: 8 }}>
          Seu WhatsApp de contato <span style={{ fontSize: 11, fontWeight: 500, color: textSec }}>(com DDD)</span>
        </label>
        <PhoneInput
          value={form.phone}
          onChange={v => { setForm(f => ({ ...f, phone: formatarTelefoneBR(v) })); setErrors(e => ({ ...e, phone: undefined })); }}
          error={errors.phone}
          inputBg={inputBg} inputBdr={inputBdr} textPri={textPri} textSec={textSec}
        />
        {errors.phone && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#DC3545', fontWeight: 600, margin: '6px 0 8px' }}>
            <AlertCircle size={12} strokeWidth={2.5} /> {errors.phone}
          </p>
        )}
        <div style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 12, padding: '10px 12px', marginTop: 8, display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>ℹ️</span>
          <p style={{ fontSize: 11.5, color: textSec, margin: 0, lineHeight: 1.55 }}>
            Este é o seu número pessoal — usado só para identificação no SmartRoutes.
            <br />
            <strong style={{ color: textPri }}>O WhatsApp da van</strong> que enviará mensagens aos responsáveis é conectado depois, escaneando um <strong style={{ color: textPri }}>QR Code</strong> na tela <em>WhatsApp</em>. Pode ser o mesmo número ou outro.
          </p>
        </div>
      </div>

      {/* Security section */}
      <SectionLabel>Segurança</SectionLabel>

      <InputField {...tokens} id="reg-pw" type={showPwd ? 'text' : 'password'} label="Senha"
        placeholder="Mínimo 6 caracteres" value={form.password} onChange={set('password')}
        error={errors.password} autoComplete="new-password"
        rightEl={<EyeBtn show={showPwd} onClick={() => setShowPwd(v => !v)} color={textSec} />} />
      {form.password && <div style={{ marginTop: -10, marginBottom: 16 }}><StrengthBar password={form.password} /></div>}

      <InputField {...tokens} id="reg-confirm" type={showConfirm ? 'text' : 'password'} label="Confirmar Senha"
        placeholder="Repita a senha" value={form.confirm} onChange={set('confirm')}
        error={errors.confirm} autoComplete="new-password"
        rightEl={
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {form.confirm && form.password === form.confirm && (
              <CheckCircle2 size={18} color="#198754" strokeWidth={2.5} />
            )}
            <EyeBtn show={showConfirm} onClick={() => setShowConfirm(v => !v)} color={textSec} />
          </div>
        } />

      {/* Terms */}
      <div style={{ background: isDark ? 'rgba(255,193,7,0.08)' : 'rgba(255,193,7,0.08)', border: `1.5px solid rgba(255,193,7,${isDark ? '0.2' : '0.3'})`, borderRadius: 14, padding: '12px 14px', marginBottom: 26, display: 'flex', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>📋</span>
        <p style={{ fontSize: 12, color: isDark ? 'rgba(255,193,7,0.8)' : '#5D4E00', margin: 0, lineHeight: 1.6 }}>
          Ao criar sua conta, você concorda com os{' '}
          <button type="button" style={{ background: 'none', border: 'none', color: isDark ? '#FFC107' : '#C56A00', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 12, textDecoration: 'underline' }}>
            Termos de Uso
          </button>{' '}e a{' '}
          <button type="button" style={{ background: 'none', border: 'none', color: isDark ? '#FFC107' : '#C56A00', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 12, textDecoration: 'underline' }}>
            Política de Privacidade
          </button>.
        </p>
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="auth-slide-up" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: isDark ? 'rgba(220,53,69,0.15)' : '#FFF5F5', border: `1.5px solid ${isDark ? 'rgba(220,53,69,0.4)' : '#DC3545'}`, borderRadius: 14, padding: '13px 16px', marginBottom: 16 }}>
          <AlertCircle size={18} color="#DC3545" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#DC3545', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>{submitError}</p>
        </div>
      )}

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
        {loading ? <><Spinner /> Criando conta...</> : <>Criar Conta <ArrowRight size={18} strokeWidth={2.5} /></>}
      </button>

      {/* Login link */}
      <p style={{ textAlign: 'center', fontSize: 14, color: textSec, marginTop: 24, marginBottom: 0 }}>
        Já tem uma conta?{' '}
        <button type="button" onClick={onGoLogin}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#FFC107', padding: 0, minHeight: 36 }}>
          Fazer login
        </button>
      </p>
    </form>
  );

  /* ── MOBILE ─────────────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{ width: '100%', maxWidth: 480, height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0F1117', fontFamily: 'Inter, -apple-system, sans-serif', overflow: 'hidden', boxShadow: '0 0 80px rgba(0,0,0,0.5)' }}>
        <style>{`
          @keyframes auth-spin { to { transform: rotate(360deg); } }
          @keyframes auth-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
          @keyframes auth-slide-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
          .auth-slide-up { animation: auth-slide-up 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        `}</style>

        {needsConfirmEmail ? (
          <ConfirmEmailState email={form.email} isDark={true} isMobile={true} onGoLogin={onGoLogin} />
        ) : success ? (
          <SuccessState name={form.name} isDark={true} isMobile={true} onGoLogin={onGoLogin} />
        ) : (
          <>
            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 14px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
              <button onClick={onGoLogin} className="touch-scale"
                style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                aria-label="Voltar">
                <ArrowLeft size={22} color="#fff" strokeWidth={2.2} />
              </button>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>Criar conta</h1>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Preencha seus dados para começar</p>
              </div>
              <div style={{ width: 34, height: 34, background: '#FFC107', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 18 }}>🚌</span>
              </div>
            </div>

            {/* Scrollable form */}
            <div style={{ flex: 1, background: isDark ? '#1C2128' : '#F0F2F5', borderRadius: '24px 24px 0 0', overflowY: 'auto', WebkitOverflowScrolling: 'touch', boxShadow: '0 -8px 32px rgba(0,0,0,0.3)' }}>
              <div style={{ padding: '28px 20px 48px' }}>
                {TheForm}
                <p style={{ textAlign: 'center', fontSize: 11, color: isDark ? 'rgba(255,255,255,0.12)' : '#CED4DA', marginTop: 20 }}>
                  SmartRoutes v3.0 · Todos os direitos reservados
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── DESKTOP / TABLET — Split Screen ───────────────────────── */
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

      {/* LEFT — Brand panel, naturally 100vh from CSS Grid row */}
      <RegisterBrandPanel onGoLogin={onGoLogin} />

      {/* ── RIGHT — Form panel ────────────────────────────────────────────
            FIX A — height: 100vh (explicit viewport unit, NOT '100%')
                     '100%' fails when the percentage resolution chain is
                     ambiguous; 100vh is always unambiguous.
            FIX B — overflowY: 'auto' → this column scrolls in isolation.
                     Left panel and page body never move.
            FIX C — NO flex centering on this wrapper (removed alignItems /
                     justifyContent). Flex-center + overflow:auto pushes
                     content above y=0, making the logo unreachable.
            FIX D — Horizontal centering via margin:'0 auto' on inner wrapper.
            FIX E — paddingTop on inner wrapper (≈ Bootstrap pt-5) ensures
                     logo/title are always visible below the viewport top.
      ─────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          height: '100vh',         /* explicit viewport height — never ambiguous */
          overflowY: 'auto',       /* isolated scroll column; left stays fixed  */
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          background: bg,
          /* NO padding / flex alignment — lives on the inner wrapper */
        }}
      >
        {/* Inner wrapper — top-padded + horizontally centered */}
        <div
          style={{
            maxWidth: 440,
            margin: '0 auto',           /* horizontal center — no flex tricks */
            padding: '48px 32px 56px',  /* pt≈3rem prevents top-clipping */
            boxSizing: 'border-box',
          }}
        >
          {needsConfirmEmail ? (
            <div style={{ background: cardBg, borderRadius: 28, padding: '60px 40px', boxShadow: isDark ? '0 8px 48px rgba(0,0,0,0.6)' : '0 8px 48px rgba(0,0,0,0.1)', border: isDark ? '1px solid rgba(255,255,255,0.07)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <ConfirmEmailState email={form.email} isDark={isDark} isMobile={false} onGoLogin={onGoLogin} />
            </div>
          ) : success ? (
            <div style={{ background: cardBg, borderRadius: 28, padding: '60px 40px', boxShadow: isDark ? '0 8px 48px rgba(0,0,0,0.6)' : '0 8px 48px rgba(0,0,0,0.1)', border: isDark ? '1px solid rgba(255,255,255,0.07)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <SuccessState name={form.name} isDark={isDark} isMobile={false} onGoLogin={onGoLogin} />
            </div>
          ) : (
            <div style={{ background: cardBg, borderRadius: 28, padding: '44px 40px', boxShadow: isDark ? '0 8px 48px rgba(0,0,0,0.6)' : '0 8px 48px rgba(0,0,0,0.1)', border: isDark ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg, #FFC107, #E6A800)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(255,193,7,0.4)' }}>
                  <span style={{ fontSize: 20 }}>🚌</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: textPri, margin: 0 }}>SmartRoutes</p>
                  <p style={{ fontSize: 11, color: textSec, margin: 0 }}>Crie sua conta grátis</p>
                </div>
                <button onClick={onGoLogin}
                  style={{ width: 36, height: 36, borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.06)' : '#F0F2F5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Voltar ao login">
                  <X size={16} color={textSec} strokeWidth={2} />
                </button>
              </div>

              <h2 style={{ fontSize: 26, fontWeight: 800, color: textPri, margin: '0 0 6px', letterSpacing: -0.3 }}>
                Criar conta ✨
              </h2>
              <p style={{ fontSize: 14, color: textSec, margin: '0 0 30px', fontWeight: 400 }}>
                Preencha seus dados para configurar o bot WhatsApp
              </p>

              {TheForm}
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: 11, color: isDark ? 'rgba(255,255,255,0.18)' : '#CED4DA', marginTop: 20, marginBottom: 0 }}>
            SmartRoutes v3.0 · © 2026 Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
}