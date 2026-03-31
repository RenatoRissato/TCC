import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ChevronDown, BarChart3, User, Lock, LogOut,
  Phone, Mail, Car, Eye, EyeOff, CheckCircle2, AlertCircle,
  Save, Moon, SunMedium, Edit3, Users, Bell, Settings2,
  Globe, HelpCircle, ExternalLink, ChevronRight, Volume2,
  MessageCircle, Smartphone, MapPin, Sun, X, Menu,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useTheme, useColors } from '../context/ThemeContext';
import { useBreakpoints } from '../hooks/useWindowSize';
import { passengers, getSummary } from '../data/mockData';
import { useNavDrawer } from '../context/NavDrawerContext';

// ─── Chart data ───────────────────────────────────────────────────────
const weeklyBarData = [
  { day: 'Seg', going: 9,  absent: 2, pending: 1 },
  { day: 'Ter', going: 10, absent: 1, pending: 1 },
  { day: 'Qua', going: 8,  absent: 3, pending: 1 },
  { day: 'Qui', going: 11, absent: 1, pending: 0 },
  { day: 'Sex', going: 7,  absent: 2, pending: 3 },
];

// ─── Toggle switch ────────────────────────────────────────────────────
function Toggle({ value, onChange, color = '#198754' }: {
  value: boolean; onChange: (v: boolean) => void; color?: string;
}) {
  return (
    <button role="switch" aria-checked={value} onClick={() => onChange(!value)}
      style={{ width: 50, height: 28, borderRadius: 14,
        background: value ? color : '#CED4DA', border: 'none',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        transition: 'background 0.2s', padding: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: value ? 25 : 3,
        width: 22, height: 22, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
    </button>
  );
}

// ─── Form input ───────────────────────────────────────────────────────
function FormInput({ label, icon: Icon, value, onChange, type = 'text',
  placeholder, c, rightEl }: {
  label: string; icon: React.ComponentType<any>; value: string;
  onChange: (v: string) => void; type?: string; placeholder?: string;
  c: ReturnType<typeof useColors>; rightEl?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700,
        color: c.textSec, marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 14, top: '50%',
          transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <Icon size={16} color={c.textMuted} strokeWidth={2} />
        </div>
        <input type={type} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', background: c.inputBg,
            border: `2px solid ${c.inputBorder}`, borderRadius: 13,
            padding: '12px 14px 12px 40px', paddingRight: rightEl ? 46 : 14,
            fontSize: 14, fontWeight: 500, color: c.text, outline: 'none',
            fontFamily: 'Inter,sans-serif', minHeight: 50, transition: 'border-color 0.2s' }}
          onFocus={e => {
            e.currentTarget.style.borderColor = '#FFC107';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,193,7,0.12)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = c.inputBorder;
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        {rightEl && (
          <div style={{ position: 'absolute', right: 12, top: '50%',
            transform: 'translateY(-50%)' }}>{rightEl}</div>
        )}
      </div>
    </div>
  );
}

// ─── Profile Edit Modal ───────────────────────────────────────────────
function ProfileEditModal({ c, isDesktop, user, onClose }: {
  c: ReturnType<typeof useColors>;
  isDesktop: boolean;
  user: any;
  onClose: () => void;
}) {
  const [pName,  setPName]  = useState(user?.name   ?? 'Carlos Andrade');
  const [pPhone, setPPhone] = useState(user?.phone   ?? '+55 11 99999-0001');
  const [pEmail, setPEmail] = useState(user?.email   ?? 'carlos@smartroutes.app');
  const [pPlate, setPPlate] = useState(user?.plate   ?? 'BRA-2E19');
  const [pVeh,   setPVeh]   = useState(user?.vehicle ?? 'Mercedes Sprinter 415 CDI · 2022');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.65)', display: 'flex',
        alignItems: isDesktop ? 'center' : 'flex-end',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="slide-up"
        style={{ width: '100%', maxWidth: isDesktop ? 520 : 560,
          maxHeight: isDesktop ? '85dvh' : '92dvh',
          background: c.card,
          borderRadius: isDesktop ? 24 : '28px 28px 0 0',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -8px 48px rgba(0,0,0,0.45)',
          fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ flexShrink: 0, padding: '18px 20px 16px',
          borderBottom: `1px solid ${c.divider}` }}>
          <div style={{ width: 40, height: 4, borderRadius: 2,
            background: c.divider, margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 15,
              background: 'rgba(255,193,7,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={22} color="#FFC107" strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: c.text,
                margin: 0, lineHeight: 1.2 }}>Editar Perfil</p>
              <p style={{ fontSize: 12, color: c.textSec, margin: 0 }}>
                Atualize suas informações pessoais
              </p>
            </div>
            <button onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: 11,
                background: c.inputBg, border: `1px solid ${c.border}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center' }} aria-label="Fechar">
              <X size={18} color={c.textSec} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px',
          WebkitOverflowScrolling: 'touch' }}>
          {saved && (
            <div className="slide-up"
              style={{ display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(25,135,84,0.1)', border: '1.5px solid rgba(25,135,84,0.3)',
                borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
              <CheckCircle2 size={18} color="#198754" strokeWidth={2.5} />
              <p style={{ fontSize: 13, color: '#198754', fontWeight: 600, margin: 0 }}>
                Perfil atualizado com sucesso!
              </p>
            </div>
          )}

          <div style={{ display: 'grid',
            gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 0 }}>
            <div style={isDesktop ? { paddingRight: 10 } : {}}>
              <FormInput label="Nome Completo" icon={User} value={pName}
                onChange={setPName} placeholder="Seu nome completo" c={c} />
            </div>
            <div style={isDesktop ? { paddingLeft: 10 } : {}}>
              <FormInput label="WhatsApp" icon={Phone} type="tel" value={pPhone}
                onChange={setPPhone} placeholder="+55 (11) 99999-0000" c={c} />
            </div>
            <div style={isDesktop ? { paddingRight: 10 } : {}}>
              <FormInput label="E-mail" icon={Mail} type="email" value={pEmail}
                onChange={setPEmail} placeholder="seu@email.com" c={c} />
            </div>
            <div style={isDesktop ? { paddingLeft: 10 } : {}}>
              <FormInput label="Placa do Veículo" icon={Car} value={pPlate}
                onChange={setPPlate} placeholder="BRA-2E19" c={c} />
            </div>
          </div>
          <FormInput label="Descrição do Veículo" icon={Car} value={pVeh}
            onChange={setPVeh} placeholder="Ex: Mercedes Sprinter 415 CDI · 2022" c={c} />
          <div style={{ height: 8 }} />
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, padding: '12px 20px 20px',
          borderTop: `1px solid ${c.divider}`, display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'transparent', border: `2px solid ${c.border}`,
              borderRadius: 14, padding: '13px 20px', fontSize: 14, fontWeight: 700,
              color: c.textSec, cursor: 'pointer', minHeight: 52,
              fontFamily: 'Inter,sans-serif' }}>
            <X size={16} strokeWidth={2.5} /> Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || saved}
            style={{ flex: 1, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              background: saved ? '#198754' : saving ? 'rgba(255,193,7,0.7)' : '#FFC107',
              border: 'none', borderRadius: 14, padding: '13px 24px',
              fontSize: 15, fontWeight: 800,
              color: saved ? '#fff' : '#212529',
              cursor: saving ? 'default' : 'pointer', minHeight: 52,
              fontFamily: 'Inter,sans-serif', transition: 'background .2s',
              boxShadow: saved
                ? '0 4px 16px rgba(25,135,84,0.3)'
                : '0 4px 16px rgba(255,193,7,0.35)' }}>
            {saved
              ? <><CheckCircle2 size={17} strokeWidth={2.5} />Salvo!</>
              : saving
              ? <>Salvando...</>
              : <><Save size={17} strokeWidth={2.5} />Salvar Perfil</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shift config card ─────────────────────────────���──────────────────
function ShiftCard({ emoji, label, enabled, onToggle, time, onTime, color, c }: {
  emoji: string; label: string; enabled: boolean; onToggle: (v: boolean) => void;
  time: string; onTime: (v: string) => void; color: string;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <div style={{ background: c.bg,
      border: `2px solid ${enabled ? color + '50' : c.border}`,
      borderRadius: 18, overflow: 'hidden',
      opacity: enabled ? 1 : 0.65, transition: 'all 0.25s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        background: enabled ? `${color}10` : 'transparent',
        borderBottom: `1px solid ${c.divider}` }}>
        <div style={{ width: 40, height: 40, borderRadius: 12,
          background: enabled ? `${color}22` : c.inputBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0 }}>{emoji}</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: c.text, margin: 0 }}>{label}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%',
              background: enabled ? '#4ADE80' : '#CED4DA' }} />
            <span style={{ fontSize: 11, fontWeight: 600,
              color: enabled ? '#198754' : c.textMuted }}>
              {enabled ? 'Turno Ativo' : 'Turno Inativo'}
            </span>
          </div>
        </div>
        <Toggle value={enabled} onChange={onToggle} color={color} />
      </div>
      <div style={{ padding: '14px 16px' }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
          color: c.textSec, marginBottom: 8,
          textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Horário de Saída
        </label>
        <input type="time" value={time} onChange={e => onTime(e.target.value)}
          disabled={!enabled}
          style={{ width: '100%', background: enabled ? c.inputBg : c.divider,
            border: `2px solid ${enabled ? color + '50' : c.inputBorder}`,
            borderRadius: 12, padding: '10px 14px', fontSize: 20, fontWeight: 800,
            color: enabled ? color : c.textMuted, outline: 'none',
            fontFamily: 'Inter,sans-serif',
            cursor: enabled ? 'pointer' : 'not-allowed',
            minHeight: 52, transition: 'all 0.2s', letterSpacing: 2,
            boxSizing: 'border-box' as const }}
        />
      </div>
    </div>
  );
}

// ─── Accordion item ───────────────────────────────────────────────────
function AccordionItem({ id, open, onToggle, icon, iconBg, title, subtitle,
  accent = '#FFC107', children, c, badge }: {
  id: string; open: boolean; onToggle: (id: string) => void;
  icon: React.ReactNode; iconBg: string; title: string; subtitle: string;
  accent?: string; children: React.ReactNode;
  c: ReturnType<typeof useColors>; badge?: string;
}) {
  return (
    <div style={{ background: c.card, borderRadius: 20, overflow: 'hidden',
      border: open ? `2px solid ${accent}38` : `1.5px solid ${c.cardBorder}`,
      boxShadow: open ? `0 4px 24px ${accent}18` : c.cardShadow,
      transition: 'border-color 0.2s, box-shadow 0.2s' }}>
      <button onClick={() => onToggle(id)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 18px', background: 'transparent', border: 'none',
          cursor: 'pointer', minHeight: 68,
          fontFamily: 'Inter, sans-serif', textAlign: 'left' }}>
        <div style={{ width: 46, height: 46, borderRadius: 15,
          background: open ? `${accent}22` : iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'background 0.2s', position: 'relative' }}>
          {icon}
          {badge && (
            <span style={{ position: 'absolute', top: -4, right: -4,
              background: '#DC3545', color: '#fff', fontSize: 9, fontWeight: 800,
              padding: '2px 5px', borderRadius: 8, lineHeight: 1 }}>
              {badge}
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: c.text,
            margin: 0, lineHeight: 1.2 }}>{title}</p>
          <p style={{ fontSize: 12, color: c.textSec, margin: '2px 0 0',
            fontWeight: 400 }}>{subtitle}</p>
        </div>
        {open && <div style={{ width: 8, height: 8, borderRadius: '50%',
          background: accent, flexShrink: 0 }} />}
        <ChevronDown size={20} color={open ? accent : c.textMuted} strokeWidth={2.2}
          style={{ transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.25s', flexShrink: 0 }} />
      </button>
      {open && <div style={{ height: 1, background: c.divider, margin: '0 18px' }} />}
      {open && (
        <div className="slide-up" style={{ padding: '20px 18px 22px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────
function ChartTip({ active, payload, label, c }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`,
      borderRadius: 12, padding: '10px 14px',
      boxShadow: c.cardShadow, fontFamily: 'Inter,sans-serif' }}>
      {label && <p style={{ fontSize: 12, fontWeight: 700, color: c.text,
        margin: '0 0 6px' }}>{label}</p>}
      {payload.map((e: any) => (
        <p key={e.dataKey} style={{ fontSize: 12, color: e.fill,
          margin: '2px 0', fontWeight: 600 }}>
          {e.dataKey}: <strong>{e.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Notification toggle row ──────────────────────────────────────────
function ToggleRow({ icon: Icon, iconColor, title, desc, value, onChange, c, last }: {
  icon: React.ComponentType<any>; iconColor: string;
  title: string; desc: string; value: boolean;
  onChange: (v: boolean) => void;
  c: ReturnType<typeof useColors>;
  last?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14,
      padding: '13px 0',
      borderBottom: last ? 'none' : `1px solid ${c.divider}` }}>
      <div style={{ width: 38, height: 38, borderRadius: 12,
        background: `${iconColor}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0 }}>
        <Icon size={18} color={iconColor} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: c.text, margin: 0 }}>{title}</p>
        <p style={{ fontSize: 11, color: c.textSec,
          margin: '2px 0 0', lineHeight: 1.4 }}>{desc}</p>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

// ─── Passenger mini card ──────────────────────────────────────────────
function MiniPassengerCard({ p, c, onNavigate }: {
  p: typeof passengers[0]; c: ReturnType<typeof useColors>; onNavigate: () => void;
}) {
  const statusColor = p.status === 'going' ? '#198754'
    : p.status === 'absent' ? '#DC3545' : '#FD7E14';
  return (
    <button onClick={onNavigate}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        background: c.bg, border: `1.5px solid ${c.border}`,
        borderRadius: 14, padding: '11px 14px', cursor: 'pointer',
        textAlign: 'left', fontFamily: 'Inter, sans-serif',
        transition: 'border-color 0.15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#FFC107'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; }}>
      <div style={{ width: 36, height: 36, borderRadius: 11,
        background: 'linear-gradient(135deg,rgba(255,193,7,0.2),rgba(255,193,7,0.08))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 800, color: '#FFC107', flexShrink: 0 }}>
        {p.initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: c.text, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.name}
        </p>
        <p style={{ fontSize: 11, color: c.textSec, margin: 0 }}>
          {p.grade} · {p.neighborhood}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }} />
        <ChevronRight size={14} color={c.textMuted} strokeWidth={2} />
      </div>
    </button>
  );
}

// ─── Open key type ────────────────────────────────────────────────────
type OpenKey = 'stats' | 'passengers' | 'notifications' | 'preferences'
             | 'shifts' | 'password' | 'support' | null;

// ─── Main screen ──────────────────────────────────────────────────────
export function SettingsScreen() {
  const navigate                = useNavigate();
  const { user, logout }        = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const c                       = useColors();
  const { isDesktop, isLg, isMd } = useBreakpoints();
  const { openDrawer }          = useNavDrawer();

  const [open, setOpen]       = useState<OpenKey>(null);
  const [editProfile, setEditProfile] = useState(false);
  const toggle = (id: string) =>
    setOpen(prev => (prev === id ? null : id as OpenKey));

  // ── Password ───────────────────────────────────────────────────────
  const [pwCur,   setPwCur]   = useState('');
  const [pwNew,   setPwNew]   = useState('');
  const [pwConf,  setPwConf]  = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwErr,   setPwErr]   = useState('');
  const [pwOk,    setPwOk]    = useState(false);

  // ── Shifts ─────────────────────────────────────────────────────────
  const [shifts, setShifts] = useState([
    { id: 'morning',   emoji: '☀️',  label: 'Rota Manhã',  enabled: true,  time: '07:15', color: '#FFC107' },
    { id: 'afternoon', emoji: '🌤️', label: 'Rota Tarde',  enabled: true,  time: '12:30', color: '#FD7E14' },
    { id: 'night',     emoji: '🌙',  label: 'Rota Noite',  enabled: true,  time: '19:00', color: '#6C5CE7' },
  ]);
  const [shiftSaved, setShiftSaved] = useState(false);
  const updateShift = (id: string, ch: Partial<typeof shifts[0]>) =>
    setShifts(prev => prev.map(s => s.id === id ? { ...s, ...ch } : s));

  // ── Notifications ──────────────────────────────────────────────────
  const [notifWA,      setNotifWA]      = useState(true);
  const [notifPush,    setNotifPush]    = useState(true);
  const [notifPending, setNotifPending] = useState(false);
  const [alertSound,   setAlertSound]   = useState('default');

  // ── Preferences ────────────────────────────────────────────────────
  const [language, setLanguage] = useState('pt-BR');

  // ── Handlers ──────────────────────────────────────────────────────
  const savePassword = async () => {
    setPwErr('');
    if (!pwCur)           { setPwErr('Insira a senha atual.'); return; }
    if (pwNew.length < 6) { setPwErr('Nova senha: mínimo 6 caracteres.'); return; }
    if (pwNew !== pwConf) { setPwErr('As senhas não coincidem.'); return; }
    await new Promise(r => setTimeout(r, 700));
    setPwOk(true); setPwCur(''); setPwNew(''); setPwConf('');
    setTimeout(() => setPwOk(false), 2500);
  };

  const saveShifts = async () => {
    await new Promise(r => setTimeout(r, 500));
    setShiftSaved(true); setTimeout(() => setShiftSaved(false), 2000);
  };

  // ── Data ───────────────────────────────────────────────────────────
  const sum              = getSummary(passengers);
  const pieData = [
    { name: 'Vai',      value: sum.going,   color: '#198754' },
    { name: 'Não Vai',  value: sum.absent,  color: '#DC3545' },
    { name: 'Pendente', value: sum.pending, color: '#FD7E14' },
  ];
  const monthlyPct       = 91;
  const pendingPassengers = passengers.filter(p => p.status === 'pending');
  const px               = isDesktop ? 36 : isMd ? 24 : 16;

  const selStyle = {
    background: c.inputBg, border: `2px solid ${c.inputBorder}`,
    borderRadius: 12, padding: '10px 12px', fontSize: 14,
    fontWeight: 500, color: c.text, outline: 'none',
    fontFamily: 'Inter,sans-serif', cursor: 'pointer',
    minHeight: 46, width: '100%', boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ background: c.bg, minHeight: '100%', transition: 'background 0.3s' }}>

      {/* ── Profile Header (TOP) ───────────────────── */}
      <div style={{
        background: isDark
          ? 'linear-gradient(160deg,#0A0D12 0%,#161B22 100%)'
          : 'linear-gradient(160deg,#161B22 0%,#212529 100%)',
        padding: `${isDesktop ? 28 : 24}px ${px}px 28px`,
        position: 'relative', overflow: 'hidden', transition: 'background 0.3s',
      }}>
        {/* Decorative orb */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200,
          borderRadius: '50%', background: 'rgba(255,193,7,0.06)', pointerEvents: 'none' }} />

        {/* Avatar row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16,
          marginBottom: 20, position: 'relative', zIndex: 1 }}>

          {/* Hamburger — only when sidebar is hidden (< 992 px) */}
          {!isLg && (
            <button onClick={openDrawer} className="touch-scale"
              aria-label="Abrir menu de navegação"
              style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', alignSelf: 'flex-start' }}>
              <Menu size={20} color="rgba(255,255,255,0.8)" strokeWidth={2} />
            </button>
          )}

          {/* Avatar with overlapping pencil edit icon */}
          <div style={{ position: 'relative' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22,
              background: 'linear-gradient(135deg,#FFC107,#E6A800)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, color: '#212529',
              boxShadow: '0 4px 20px rgba(255,193,7,0.4)',
              letterSpacing: -1 }}>
              {(user?.name ?? 'CA').split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
            </div>
            {/* Pencil edit button — overlapping the avatar */}
            <button
              onClick={() => setEditProfile(true)}
              aria-label="Editar perfil"
              style={{ position: 'absolute', bottom: -5, right: -5,
                width: 28, height: 28, borderRadius: 9,
                background: '#FFC107', border: '2.5px solid #161B22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                zIndex: 2 }}>
              <Edit3 size={13} color="#212529" strokeWidth={2.5} />
            </button>
          </div>

          {/* Name / email / vehicle */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff',
              margin: '0 0 3px', lineHeight: 1.2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name ?? 'Carlos Andrade'}
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)',
              margin: '0 0 2px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email ?? 'carlos@smartroutes.app'}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.vehicle ?? 'Mercedes Sprinter 415 CDI · 2022'}
            </p>
          </div>

          {/* Theme toggle pill (hidden when sidebar is visible) */}
          {!isLg && (
            <button onClick={toggleTheme}
              style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: isDark ? 'rgba(255,193,7,0.15)' : 'rgba(255,255,255,0.08)',
                border: isDark ? '1.5px solid rgba(255,193,7,0.3)' : '1.5px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer' }}
              aria-label="Alternar tema">
              {isDark
                ? <SunMedium size={20} color="#FFC107" strokeWidth={2} />
                : <Moon      size={20} color="rgba(255,255,255,0.7)" strokeWidth={2} />}
            </button>
          )}
        </div>

        {/* Quick stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
          gap: 8, position: 'relative', zIndex: 1 }}>
          {[
            { label: 'Total',    value: passengers.length, color: '#FFC107' },
            { label: 'Vão',      value: sum.going,         color: '#4ADE80' },
            { label: 'Ausentes', value: sum.absent,         color: '#FF6B7A' },
            { label: 'Pend.',    value: sum.pending,        color: '#FD7E14' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '10px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>
                {value}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700,
                color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>
                {label.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Accordion list (8 items) ────────────────── */}
      <div style={{ padding: `20px ${px}px`, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Item 1 — Statistics & Dashboards */}
        <AccordionItem id="stats" open={open === 'stats'} onToggle={toggle}
          icon={<BarChart3 size={22} color="#6C5CE7" strokeWidth={2} />}
          iconBg="rgba(108,92,231,0.12)"
          title="Estatísticas & Dashboards"
          subtitle="Presença hoje, confirmações semanais, taxa mensal"
          accent="#6C5CE7" c={c}>
          {/* Today's pie */}
          <p style={{ fontSize: 11, fontWeight: 800, color: c.sectionTitle,
            letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>
            STATUS DE HOJE
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 140, height: 140, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%"
                    innerRadius={38} outerRadius={56} paddingAngle={3} dataKey="value">
                    {pieData.map(e => (
                      <Cell key={`pie-cell-${e.name}`} fill={e.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTip c={c} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {pieData.map(e => (
                <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3,
                    background: e.color, flexShrink: 0 }} />
                  <p style={{ flex: 1, fontSize: 13, fontWeight: 600,
                    color: c.text, margin: 0 }}>{e.name}</p>
                  <span style={{ fontSize: 16, fontWeight: 900, color: e.color }}>
                    {e.value}
                  </span>
                  <span style={{ fontSize: 11, color: c.textSec,
                    fontWeight: 500, minWidth: 32 }}>
                    {sum.total > 0 ? Math.round(e.value / sum.total * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly bar */}
          <div style={{ height: 1, background: c.divider, margin: '18px 0' }} />
          <p style={{ fontSize: 11, fontWeight: 800, color: c.sectionTitle,
            letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>
            CONFIRMAÇÕES DA SEMANA
          </p>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyBarData}
                margin={{ top: 4, right: 8, left: -22, bottom: 0 }}
                barSize={8} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.gridColor} vertical={false} />
                <XAxis dataKey="day"
                  tick={{ fontSize: 11, fill: c.axisColor, fontFamily: 'Inter,sans-serif' }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: c.axisColor }}
                  axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip c={c} />}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar key="bar-going"   dataKey="going"   fill="#198754" radius={[4,4,0,0]} />
                <Bar key="bar-absent"  dataKey="absent"  fill="#DC3545" radius={[4,4,0,0]} />
                <Bar key="bar-pending" dataKey="pending" fill="#FD7E14" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
            {[
              { color: '#198754', label: 'Vão' },
              { color: '#DC3545', label: 'Ausentes' },
              { color: '#FD7E14', label: 'Pendentes' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                <span style={{ fontSize: 11, color: c.textSec, fontWeight: 500 }}>
                  {l.label}
                </span>
              </div>
            ))}
          </div>

          {/* Monthly % */}
          <div style={{ height: 1, background: c.divider, margin: '18px 0' }} />
          <p style={{ fontSize: 11, fontWeight: 800, color: c.sectionTitle,
            letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>
            TAXA DE PRESENÇA MENSAL
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18,
            background: 'rgba(25,135,84,0.08)',
            border: '1.5px solid rgba(25,135,84,0.2)',
            borderRadius: 18, padding: '18px 20px' }}>
            <div>
              <p style={{ fontSize: 52, fontWeight: 900, color: '#198754',
                lineHeight: 1, margin: 0 }}>
                {monthlyPct}<span style={{ fontSize: 24 }}>%</span>
              </p>
              <p style={{ fontSize: 11, color: c.textSec, margin: '4px 0 0' }}>Março 2026</p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>📈</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#198754' }}>
                  +3% vs. mês anterior
                </span>
              </div>
              <p style={{ fontSize: 12, color: c.textSec, margin: 0, lineHeight: 1.5 }}>
                Excelente desempenho!<br />Meta mensal atingida.
              </p>
            </div>
          </div>
        </AccordionItem>

        {/* Item 2 — Passenger Management */}
        <AccordionItem id="passengers" open={open === 'passengers'} onToggle={toggle}
          icon={<Users size={22} color="#0EA5E9" strokeWidth={2} />}
          iconBg="rgba(14,165,233,0.12)"
          title="Gerenciar Passageiros"
          subtitle={`${passengers.length} cadastrados · ${pendingPassengers.length} sem resposta`}
          accent="#0EA5E9" c={c}
          badge={pendingPassengers.length > 0 ? String(pendingPassengers.length) : undefined}>
          {/* Status summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
            gap: 8, marginBottom: 16 }}>
            {[
              { n: sum.going,   label: 'Vão',       color: '#198754', bg: 'rgba(25,135,84,0.1)'  },
              { n: sum.absent,  label: 'Ausentes',   color: '#DC3545', bg: 'rgba(220,53,69,0.1)'  },
              { n: sum.pending, label: 'Pendentes',  color: '#FD7E14', bg: 'rgba(253,126,20,0.1)' },
            ].map(x => (
              <div key={x.label} style={{ background: x.bg, borderRadius: 12,
                padding: '10px 8px', textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: x.color, margin: 0 }}>{x.n}</p>
                <p style={{ fontSize: 10, fontWeight: 700, color: x.color,
                  margin: 0, opacity: 0.8 }}>{x.label}</p>
              </div>
            ))}
          </div>

          {/* Pending passengers list */}
          {pendingPassengers.length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#FD7E14',
                letterSpacing: 1, textTransform: 'uppercase',
                margin: '0 0 10px',
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="pulse-dot" style={{ width: 7, height: 7,
                  borderRadius: '50%', background: '#FD7E14',
                  display: 'inline-block' }} />
                AGUARDANDO RESPOSTA
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {pendingPassengers.slice(0, 4).map(p => (
                  <MiniPassengerCard key={p.id} p={p} c={c}
                    onNavigate={() => navigate('/routes')} />
                ))}
              </div>
            </>
          )}

          {/* CTA */}
          <button onClick={() => navigate('/routes')}
            style={{ width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              background: '#0EA5E9', border: 'none', borderRadius: 14,
              padding: '13px 24px', fontSize: 14, fontWeight: 700,
              color: '#fff', cursor: 'pointer', minHeight: 50,
              fontFamily: 'Inter,sans-serif',
              boxShadow: '0 4px 16px rgba(14,165,233,0.35)' }}>
            <MapPin size={17} strokeWidth={2.5} />
            Ver Lista Completa de Passageiros
          </button>
        </AccordionItem>

        {/* Item 3 — Notifications */}
        <AccordionItem id="notifications" open={open === 'notifications'} onToggle={toggle}
          icon={<Bell size={22} color="#F59E0B" strokeWidth={2} />}
          iconBg="rgba(245,158,11,0.12)"
          title="Notificações"
          subtitle="Alertas do WhatsApp, push e sons"
          accent="#F59E0B" c={c}>
          <ToggleRow
            icon={MessageCircle} iconColor="#25D366"
            title="Respostas WhatsApp (Tempo real)"
            desc="Alertas imediatos quando responsáveis responderem"
            value={notifWA} onChange={setNotifWA} c={c} />
          <ToggleRow
            icon={Smartphone} iconColor="#2979FF"
            title="Push Notifications"
            desc="Notificações mesmo com app em segundo plano"
            value={notifPush} onChange={setNotifPush} c={c} />
          <ToggleRow
            icon={Bell} iconColor="#FD7E14"
            title="Lembrete de Pendentes"
            desc="Alerta 1h antes da rota para passageiros sem resposta"
            value={notifPending} onChange={setNotifPending} c={c} last />

          {/* Alert sound */}
          <div style={{ paddingTop: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700, color: c.textSec, marginBottom: 8 }}>
              <Volume2 size={14} color={c.textMuted} strokeWidth={2} />
              Som de Alerta
            </label>
            <select value={alertSound} onChange={e => setAlertSound(e.target.value)}
              style={selStyle}>
              <option value="default">🔔 Padrão do Sistema</option>
              <option value="chime">🎵 Chime Suave</option>
              <option value="bell">🔔 Sino</option>
              <option value="ding">✨ Ding</option>
              <option value="none">🔇 Silencioso</option>
            </select>
          </div>
        </AccordionItem>

        {/* Item 4 — Preferences */}
        <AccordionItem id="preferences" open={open === 'preferences'} onToggle={toggle}
          icon={<Settings2 size={22} color="#8B5CF6" strokeWidth={2} />}
          iconBg="rgba(139,92,246,0.12)"
          title="Preferências"
          subtitle="Tema escuro e idioma do aplicativo"
          accent="#8B5CF6" c={c}>
          {/* Dark mode toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px',
            background: isDark ? 'rgba(255,193,7,0.07)' : 'rgba(0,0,0,0.03)',
            borderRadius: 16, marginBottom: 14,
            border: `1.5px solid ${isDark ? 'rgba(255,193,7,0.2)' : c.border}` }}>
            <div style={{ width: 42, height: 42, borderRadius: 13,
              background: isDark ? 'rgba(255,193,7,0.15)' : 'rgba(108,117,125,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isDark
                ? <Moon      size={20} color="#FFC107"  strokeWidth={2} />
                : <SunMedium size={20} color="#6C757D"  strokeWidth={2} />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: c.text, margin: 0 }}>
                {isDark ? 'Modo Escuro Ativo' : 'Modo Claro Ativo'}
              </p>
              <p style={{ fontSize: 12, color: c.textSec, margin: 0 }}>
                {isDark ? 'Melhor para uso noturno 🌙' : 'Melhor para ambientes iluminados ☀️'}
              </p>
            </div>
            <Toggle value={isDark} onChange={toggleTheme} color="#FFC107" />
          </div>

          {/* Language */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 700, color: c.textSec, marginBottom: 8 }}>
            <Globe size={14} color={c.textMuted} strokeWidth={2} />
            Idioma do Aplicativo
          </label>
          <select value={language} onChange={e => setLanguage(e.target.value)}
            style={selStyle}>
            <option value="pt-BR">🇧🇷 Português – PT-BR</option>
            <option value="en">🇺🇸 English – EN</option>
            <option value="es">🇪🇸 Español – ES</option>
          </select>
          <p style={{ fontSize: 11, color: c.textMuted, margin: '8px 0 0' }}>
            * Alterações de idioma aplicadas no próximo login.
          </p>
        </AccordionItem>

        {/* Item 5 — Shift Configurations */}
        <AccordionItem id="shifts" open={open === 'shifts'} onToggle={toggle}
          icon={<Sun size={22} color="#FFC107" strokeWidth={2} />}
          iconBg="rgba(255,193,7,0.12)"
          title="Configurações de Turnos"
          subtitle="Ativar/desativar turnos e horários de saída"
          accent="#FFC107" c={c}>
          <div style={{ display: 'grid',
            gridTemplateColumns: isDesktop ? 'repeat(3,1fr)' : '1fr',
            gap: 14, marginBottom: 16 }}>
            {shifts.map(sh => (
              <ShiftCard key={sh.id} {...sh}
                onToggle={v => updateShift(sh.id, { enabled: v })}
                onTime={v => updateShift(sh.id, { time: v })}
                c={c} />
            ))}
          </div>
          <button onClick={saveShifts}
            style={{ width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              background: shiftSaved ? '#198754' : '#FFC107', border: 'none',
              borderRadius: 14, padding: '13px 24px', fontSize: 14, fontWeight: 700,
              color: shiftSaved ? '#fff' : '#212529', cursor: 'pointer',
              minHeight: 50, fontFamily: 'Inter,sans-serif',
              transition: 'background .25s' }}>
            {shiftSaved
              ? <><CheckCircle2 size={17} strokeWidth={2.5} />Salvo!</>
              : 'Salvar Configurações'}
          </button>
        </AccordionItem>

        {/* Item 6 — Change Password */}
        <AccordionItem id="password" open={open === 'password'} onToggle={toggle}
          icon={<Lock size={22} color="#DC3545" strokeWidth={2} />}
          iconBg="rgba(220,53,69,0.12)"
          title="Alterar Senha"
          subtitle="Troque sua senha de acesso"
          accent="#DC3545" c={c}>
          {pwOk && (
            <div className="slide-up"
              style={{ display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(25,135,84,0.1)',
                border: '1.5px solid rgba(25,135,84,0.3)',
                borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
              <CheckCircle2 size={18} color="#198754" strokeWidth={2.5} />
              <p style={{ fontSize: 13, color: '#198754', fontWeight: 600, margin: 0 }}>
                Senha alterada com sucesso!
              </p>
            </div>
          )}
          {pwErr && (
            <div className="slide-up"
              style={{ display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(220,53,69,0.1)',
                border: '1.5px solid rgba(220,53,69,0.3)',
                borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
              <AlertCircle size={18} color="#DC3545" strokeWidth={2.5} />
              <p style={{ fontSize: 13, color: '#DC3545', fontWeight: 600, margin: 0 }}>
                {pwErr}
              </p>
            </div>
          )}
          <FormInput label="Senha Atual" icon={Lock}
            type={showCur ? 'text' : 'password'} value={pwCur}
            onChange={v => { setPwCur(v); setPwErr(''); }}
            placeholder="••••••••" c={c}
            rightEl={
              <button type="button" onClick={() => setShowCur(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', padding: 4 }}>
                {showCur
                  ? <EyeOff size={18} color={c.textMuted} />
                  : <Eye    size={18} color={c.textMuted} />}
              </button>
            } />
          <FormInput label="Nova Senha" icon={Lock}
            type={showNew ? 'text' : 'password'} value={pwNew}
            onChange={v => { setPwNew(v); setPwErr(''); }}
            placeholder="Mínimo 6 caracteres" c={c}
            rightEl={
              <button type="button" onClick={() => setShowNew(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', padding: 4 }}>
                {showNew
                  ? <EyeOff size={18} color={c.textMuted} />
                  : <Eye    size={18} color={c.textMuted} />}
              </button>
            } />
          <FormInput label="Confirmar Nova Senha" icon={Lock}
            type="password" value={pwConf}
            onChange={v => { setPwConf(v); setPwErr(''); }}
            placeholder="Repita a nova senha" c={c} />
          <button onClick={savePassword}
            style={{ width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              background: 'linear-gradient(135deg,#DC3545,#B02A37)',
              border: 'none', borderRadius: 14, padding: '14px 24px',
              fontSize: 15, fontWeight: 700, color: '#fff',
              cursor: 'pointer', minHeight: 52, fontFamily: 'Inter,sans-serif',
              boxShadow: '0 4px 16px rgba(220,53,69,0.3)' }}>
            <Lock size={18} strokeWidth={2.5} /> Salvar Nova Senha
          </button>
        </AccordionItem>

        {/* Item 7 — Support */}
        <AccordionItem id="support" open={open === 'support'} onToggle={toggle}
          icon={<HelpCircle size={22} color="#14B8A6" strokeWidth={2} />}
          iconBg="rgba(20,184,166,0.12)"
          title="Suporte & Ajuda"
          subtitle="Central de ajuda, FAQs e tutoriais"
          accent="#14B8A6" c={c}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { emoji: '📖', label: 'Central de Ajuda & FAQs',
                desc: 'Perguntas frequentes e guias de uso' },
              { emoji: '🎥', label: 'Tutoriais em Vídeo',
                desc: 'Aprenda a usar todos os recursos' },
              { emoji: '💬', label: 'Chat com Suporte',
                desc: 'Fale com nossa equipe ao vivo' },
              { emoji: '📧', label: 'Enviar Feedback',
                desc: 'Sugestões e relatório de problemas' },
            ].map(item => (
              <a key={item.label} href="#"
                style={{ display: 'flex', alignItems: 'center', gap: 12,
                  background: c.bg, border: `1.5px solid ${c.border}`,
                  borderRadius: 14, padding: '13px 16px',
                  textDecoration: 'none', transition: 'border-color 0.15s' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#14B8A6';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = c.border;
                }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{item.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: c.text, margin: 0 }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: 11, color: c.textSec, margin: 0 }}>{item.desc}</p>
                </div>
                <ExternalLink size={15} color={c.textMuted} strokeWidth={2} />
              </a>
            ))}
          </div>
          {/* App version */}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10,
            background: isDark ? 'rgba(255,255,255,0.03)' : '#F8F9FA',
            border: `1px solid ${c.border}`, borderRadius: 14,
            padding: '12px 16px' }}>
            <span style={{ fontSize: 22 }}>🚌</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: c.text, margin: 0 }}>
                SmartRoutes v3.0.0
              </p>
              <p style={{ fontSize: 11, color: c.textSec, margin: 0 }}>
                Build 2026.03.20 · Licença SaaS Ativa
              </p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#198754',
              background: 'rgba(25,135,84,0.1)',
              padding: '4px 8px', borderRadius: 8 }}>
              ✓ Atualizado
            </span>
          </div>
        </AccordionItem>

        {/* Item 8 — Logout */}
        <div style={{ marginTop: 4 }}>
          <button onClick={logout}
            style={{ width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 10,
              background: 'transparent',
              border: '2px solid rgba(220,53,69,0.45)',
              borderRadius: 20, padding: '16px 24px',
              fontSize: 16, fontWeight: 700, color: '#DC3545',
              cursor: 'pointer', minHeight: 58,
              fontFamily: 'Inter,sans-serif', transition: 'all 0.2s' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(220,53,69,0.08)';
              (e.currentTarget as HTMLElement).style.borderColor = '#DC3545';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,53,69,0.45)';
            }}
            aria-label="Sair da conta">
            <LogOut size={20} strokeWidth={2.3} />
            Sair da Conta
          </button>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 4, paddingTop: 8, paddingBottom: 20 }}>
          <p style={{ fontSize: 12, color: c.textMuted, margin: 0, fontWeight: 600 }}>
            SmartRoutes v3.0.0
          </p>
          <p style={{ fontSize: 11, color: c.textMuted, margin: 0, opacity: 0.6 }}>
            Feito com ❤️ para motoristas escolares
          </p>
        </div>
      </div>

      {/* ── Profile Edit Modal (triggered by pencil icon) ── */}
      {editProfile && (
        <ProfileEditModal
          c={c}
          isDesktop={isDesktop}
          user={user}
          onClose={() => setEditProfile(false)}
        />
      )}
    </div>
  );
}