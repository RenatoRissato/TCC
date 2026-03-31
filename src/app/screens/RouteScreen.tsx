import React, { useState, useCallback, useMemo } from 'react';
import {
  Search, X, Filter, Navigation, MessageCircle,
  ChevronDown, MapPin, CheckCircle2, XCircle, Clock,
  Plus, Edit2, Trash2, User, Phone, Home, BookOpen,
  AlertCircle, Save, Users, Menu,
} from 'lucide-react';
import { passengers as SEED, Passenger, StudentStatus, RouteType, getSummary } from '../data/mockData';
import { Avatar } from '../components/shared/Avatar';
import { StatusBadge } from '../components/shared/StatusBadge';
import { useColors } from '../context/ThemeContext';
import { useBreakpoints } from '../hooks/useWindowSize';
import { useNavDrawer } from '../context/NavDrawerContext';

// ─── Types ────────────────────────────────────────────────────────────
type FilterTab = 'all' | 'going' | 'absent' | 'pending';
type Period    = 'all' | 'morning' | 'afternoon' | 'night';

interface PassengerForm {
  name:        string;
  parentName:  string;
  address:     string;
  neighborhood:string;
  phone:       string;
  grade:       string;
  routes:      RouteType[];
}

const BLANK: PassengerForm = {
  name: '', parentName: '', address: '', neighborhood: '',
  phone: '', grade: '', routes: ['morning'],
};

const PERIODS: { key: Period; label: string; emoji: string }[] = [
  { key: 'all',       label: 'Todas',  emoji: '📋' },
  { key: 'morning',   label: 'Manhã',  emoji: '☀️' },
  { key: 'afternoon', label: 'Tarde',  emoji: '🌤️' },
  { key: 'night',     label: 'Noite',  emoji: '🌙' },
];

const SHIFT_OPTIONS: { key: RouteType; label: string; emoji: string; color: string }[] = [
  { key: 'morning',   label: 'Manhã',  emoji: '☀️',  color: '#FFC107' },
  { key: 'afternoon', label: 'Tarde',  emoji: '🌤️', color: '#FD7E14' },
  { key: 'night',     label: 'Noite',  emoji: '🌙',  color: '#6C5CE7' },
];

// ─── Helpers ──────────────────────────────────────────────────────────
function initials(name: string) {
  return name.trim().split(' ').filter(Boolean).map(n => n[0].toUpperCase()).slice(0, 2).join('');
}

let _nextId = SEED.length + 1;
function nextId() { return ++_nextId; }

// ─── Map dropdown ─────────────────────────────────────────────────────
function MapDropdown({ p, c }: { p: Passenger; c: ReturnType<typeof useColors> }) {
  const [open, setOpen] = useState(false);
  const q = encodeURIComponent(`${p.address}, ${p.neighborhood}`);
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn-ghost touch-scale" onClick={() => setOpen(v => !v)}
        style={{ color: '#2979FF', borderColor: '#2979FF', fontSize: 12, minHeight: 40, padding: '8px 10px' }}
        aria-label="Mapa"
      >
        <Navigation size={15} color="#2979FF" strokeWidth={2} />
        Mapa
        <ChevronDown size={12} color="#2979FF"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 50,
            background: c.card, borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)', border: `1px solid ${c.border}`, minWidth: 160 }}>
            {[
              { emoji: '🗺️', label: 'Waze',       href: `https://waze.com/ul?q=${q}` },
              { emoji: '📍', label: 'Google Maps', href: `https://maps.google.com/maps?q=${q}` },
            ].map((item, i) => (
              <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px',
                  textDecoration: 'none', color: c.text, fontSize: 14, fontWeight: 600,
                  borderTop: i > 0 ? `1px solid ${c.divider}` : 'none' }}>
                <span style={{ fontSize: 18 }}>{item.emoji}</span> {item.label}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Passenger card ───────────────────────────────────────────────────
function PassengerCard({
  passenger: p, idx, c, onEdit, onDelete,
}: {
  passenger: Passenger; idx: number;
  c: ReturnType<typeof useColors>;
  onEdit: (p: Passenger) => void;
  onDelete: (id: number) => void;
}) {
  const absent = p.status === 'absent';
  const waUrl  = `https://wa.me/${p.phone}?text=${encodeURIComponent(
    `Olá ${p.parentName}! Confirma presença de ${p.name.split(' ')[0]} hoje? 🚌`)}`;
  return (
    <div className={`slide-up stagger-${Math.min(idx + 1, 5)}`}
      style={{ background: c.card, borderRadius: 20, overflow: 'hidden',
        opacity: absent ? 0.55 : 1, filter: absent ? 'grayscale(0.3)' : 'none',
        border: `1.5px solid ${absent ? c.border : c.cardBorder}`,
        boxShadow: absent ? 'none' : c.cardShadow, transition: 'all 0.2s' }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 12px' }}>
        <Avatar initials={p.initials} status={p.status} size={48} badge={p.stopOrder} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: absent ? c.textMuted : c.text,
            margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} color={absent ? c.textMuted : c.textSec} strokeWidth={2} />
            <p style={{ fontSize: 12, color: absent ? c.textMuted : c.textSec, fontWeight: 500,
              margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.address}
            </p>
          </div>
          <p style={{ fontSize: 11, color: c.textMuted, fontWeight: 500, margin: '2px 0 0' }}>
            {p.neighborhood} · {p.grade}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <StatusBadge status={p.status} size="md" />
          {/* Edit / Delete quick actions */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => onEdit(p)}
              style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(41,121,255,0.1)',
                border: '1px solid rgba(41,121,255,0.2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Editar passageiro">
              <Edit2 size={13} color="#2979FF" strokeWidth={2.5} />
            </button>
            <button onClick={() => onDelete(p.id)}
              style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(220,53,69,0.1)',
                border: '1px solid rgba(220,53,69,0.2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Remover passageiro">
              <Trash2 size={13} color="#DC3545" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Shift tags */}
      <div style={{ display: 'flex', gap: 4, padding: '0 16px 8px' }}>
        {p.routes.map(r => {
          const sh = SHIFT_OPTIONS.find(s => s.key === r)!;
          return (
            <span key={r} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px',
              background: `${sh.color}18`, color: sh.color, borderRadius: 6,
              border: `1px solid ${sh.color}30` }}>
              {sh.emoji} {sh.label}
            </span>
          );
        })}
      </div>

      {/* Response strip */}
      {p.responseTime && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px',
          background: p.status === 'going' ? 'rgba(25,135,84,0.07)' : 'rgba(220,53,69,0.05)' }}>
          {p.status === 'going'
            ? <CheckCircle2 size={13} color="#198754" strokeWidth={2.5} />
            : <XCircle     size={13} color="#DC3545" strokeWidth={2.5} />}
          <p style={{ fontSize: 11, fontWeight: 600, margin: 0,
            color: p.status === 'going' ? '#198754' : '#DC3545' }}>
            Respondido às {p.responseTime} via WhatsApp
          </p>
        </div>
      )}
      {p.status === 'pending' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px',
          background: 'rgba(253,126,20,0.08)' }}>
          <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%',
            background: '#FD7E14', display: 'inline-block' }} />
          <p style={{ fontSize: 11, fontWeight: 600, margin: 0, color: '#C56A00' }}>
            Aguardando resposta...
          </p>
        </div>
      )}

      <div style={{ height: 1, background: c.divider, margin: '0 16px' }} />

      {/* Actions row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 12px' }}>
        <MapDropdown p={p} c={c} />
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          className="btn-ghost touch-scale"
          style={{ color: '#128C7E', borderColor: '#128C7E', fontSize: 12,
            textDecoration: 'none', minHeight: 40, padding: '8px 10px' }}>
          <MessageCircle size={15} color="#128C7E" strokeWidth={2} />
          WhatsApp
        </a>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: c.textMuted, fontWeight: 500 }}>
          {p.parentName.split(' ')[0]}
        </span>
      </div>
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────
function Chip({ label, count, active, color, onClick }: {
  label: string; count: number; active: boolean; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        background: active ? color : 'rgba(255,255,255,0.1)',
        border: `2px solid ${active ? color : 'transparent'}`, borderRadius: 999,
        padding: '8px 14px', fontSize: 12, fontWeight: 700,
        color: active ? '#fff' : 'rgba(255,255,255,0.55)', cursor: 'pointer',
        minHeight: 40, fontFamily: 'Inter, sans-serif',
        boxShadow: active ? `0 4px 14px ${color}48` : 'none' }}>
      {label}
      <span style={{ minWidth: 20, height: 20, padding: '0 5px',
        background: active ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.1)',
        borderRadius: 10, fontSize: 10, fontWeight: 800,
        color: active ? '#fff' : 'rgba(255,255,255,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {count}
      </span>
    </button>
  );
}

// ─── Modal input field ────────────────────────────────────────────────
function MInput({
  label, icon: Icon, value, onChange, type = 'text', placeholder, c, required,
}: {
  label: string; icon: React.ComponentType<any>; value: string;
  onChange: (v: string) => void; type?: string; placeholder?: string;
  c: ReturnType<typeof useColors>; required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
        fontWeight: 700, color: c.textSec, marginBottom: 6 }}>
        <Icon size={13} color={c.textMuted} strokeWidth={2} />
        {label}
        {required && <span style={{ color: '#DC3545' }}>*</span>}
      </label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box', background: c.inputBg,
          border: `2px solid ${c.inputBorder}`, borderRadius: 13,
          padding: '12px 14px', fontSize: 14, fontWeight: 500, color: c.text,
          outline: 'none', fontFamily: 'Inter,sans-serif', minHeight: 50,
          transition: 'border-color 0.2s' }}
        onFocus={e => {
          e.currentTarget.style.borderColor = '#FFC107';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,193,7,0.12)';
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = c.inputBorder;
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

// ─── Add / Edit Passenger Modal ───────────────────────────────────────
function PassengerModal({
  editTarget, onSave, onClose, c,
}: {
  editTarget: Passenger | null;
  onSave: (form: PassengerForm, id?: number) => void;
  onClose: () => void;
  c: ReturnType<typeof useColors>;
}) {
  const isEdit = editTarget !== null;
  const [form, setForm] = useState<PassengerForm>(
    isEdit
      ? {
          name:         editTarget!.name,
          parentName:   editTarget!.parentName,
          address:      editTarget!.address,
          neighborhood: editTarget!.neighborhood,
          phone:        editTarget!.phone,
          grade:        editTarget!.grade,
          routes:       [...editTarget!.routes],
        }
      : { ...BLANK }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof PassengerForm, string>>>({});
  const [saving, setSaving] = useState(false);

  const set = (k: keyof PassengerForm) => (v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  const toggleRoute = (r: RouteType) => {
    setForm(f => ({
      ...f,
      routes: f.routes.includes(r) ? f.routes.filter(x => x !== r) : [...f.routes, r],
    }));
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim())       e.name       = 'Nome é obrigatório';
    if (!form.parentName.trim()) e.parentName  = 'Responsável é obrigatório';
    if (!form.address.trim())    e.address     = 'Endereço é obrigatório';
    if (form.phone.replace(/\D/g, '').length < 10)
                                 e.phone       = 'WhatsApp inválido';
    if (form.routes.length === 0) e.routes     = 'Selecione ao menos um turno' as any;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    onSave(form, editTarget?.id);
    setSaving(false);
  };

  const hasError = Object.keys(errors).length > 0;

  return (
    // ── Backdrop ──────────────────────────────────────────────────────
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.65)', display: 'flex',
        alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Sheet ───────────────────────────────────────────────────── */}
      <div className="slide-up"
        style={{ width: '100%', maxWidth: 560, maxHeight: '92dvh',
          background: c.card, borderRadius: '28px 28px 0 0',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
          fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}
      >
        {/* ── Sheet header ────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, padding: '18px 20px 16px',
          borderBottom: `1px solid ${c.divider}` }}>
          {/* Drag handle */}
          <div style={{ width: 40, height: 4, borderRadius: 2,
            background: c.divider, margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 15,
              background: isEdit ? 'rgba(41,121,255,0.12)' : 'rgba(25,135,84,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isEdit
                ? <Edit2 size={22} color="#2979FF" strokeWidth={2} />
                : <Users size={22} color="#198754" strokeWidth={2} />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: c.text, margin: 0, lineHeight: 1.2 }}>
                {isEdit ? 'Editar Passageiro' : 'Novo Passageiro'}
              </p>
              <p style={{ fontSize: 12, color: c.textSec, margin: 0 }}>
                {isEdit ? `Editando: ${editTarget!.name.split(' ')[0]}` : 'Preencha os dados do passageiro'}
              </p>
            </div>
            <button onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: 11,
                background: c.inputBg, border: `1px solid ${c.border}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Fechar">
              <X size={18} color={c.textSec} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ── Scrollable form body ─────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px',
          WebkitOverflowScrolling: 'touch' }}>
          {hasError && (
            <div className="slide-up"
              style={{ display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(220,53,69,0.08)', border: '1.5px solid rgba(220,53,69,0.3)',
                borderRadius: 13, padding: '11px 14px', marginBottom: 16 }}>
              <AlertCircle size={16} color="#DC3545" strokeWidth={2.5} />
              <p style={{ fontSize: 13, color: '#DC3545', fontWeight: 600, margin: 0 }}>
                Corrija os campos destacados.
              </p>
            </div>
          )}

          {/* ── Section: Personal data ──────────────────────── */}
          <SectionDivider label="Dados do Aluno" />
          <MInput label="Nome Completo" icon={User} value={form.name}
            onChange={set('name')} placeholder="Ex: Ana Beatriz Santos" c={c} required />
          {errors.name && <ErrMsg msg={errors.name} />}

          <MInput label="Série / Curso" icon={BookOpen} value={form.grade}
            onChange={set('grade')} placeholder="Ex: 5º Ano ou Engenharia" c={c} />

          {/* ── Section: Responsible ──────────────────────── */}
          <SectionDivider label="Responsável" />
          <MInput label="Nome do Responsável" icon={User} value={form.parentName}
            onChange={set('parentName')} placeholder="Ex: Maria Santos" c={c} required />
          {errors.parentName && <ErrMsg msg={errors.parentName} />}

          <MInput label="WhatsApp do Responsável" icon={Phone} type="tel"
            value={form.phone} onChange={set('phone')}
            placeholder="+55 (11) 99999-0000" c={c} required />
          {errors.phone && <ErrMsg msg={errors.phone} />}

          {/* ── Section: Address ──────────────────────────── */}
          <SectionDivider label="Endereço de Embarque" />
          <MInput label="Endereço" icon={Home} value={form.address}
            onChange={set('address')} placeholder="Ex: Rua das Flores, 123" c={c} required />
          {errors.address && <ErrMsg msg={errors.address} />}

          <MInput label="Bairro" icon={MapPin} value={form.neighborhood}
            onChange={set('neighborhood')} placeholder="Ex: Jardim América" c={c} />

          {/* ── Section: Shift selection ──────────────────── */}
          <SectionDivider label="Turnos" />
          <p style={{ fontSize: 12, color: c.textSec, margin: '0 0 10px' }}>
            Selecione os turnos que este passageiro utiliza:
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {SHIFT_OPTIONS.map(sh => {
              const active = form.routes.includes(sh.key);
              return (
                <button key={sh.key} onClick={() => toggleRoute(sh.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 100,
                    background: active ? `${sh.color}18` : c.inputBg,
                    border: `2px solid ${active ? sh.color : c.border}`,
                    borderRadius: 14, padding: '12px 14px', cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}>
                  <span style={{ fontSize: 20 }}>{sh.emoji}</span>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 13, fontWeight: 700,
                      color: active ? sh.color : c.text, margin: 0 }}>{sh.label}</p>
                    <p style={{ fontSize: 10, color: c.textMuted, margin: 0 }}>
                      {sh.key === 'morning' ? '07:15' : sh.key === 'afternoon' ? '12:30' : '19:00'}
                    </p>
                  </div>
                  {active && (
                    <CheckCircle2 size={16} color={sh.color} strokeWidth={2.5}
                      style={{ marginLeft: 'auto' }} />
                  )}
                </button>
              );
            })}
          </div>
          {(errors as any).routes && <ErrMsg msg={(errors as any).routes} />}

          <div style={{ height: 16 }} />
        </div>

        {/* ── Footer buttons ──────────────────────────────────────── */}
        <div style={{ flexShrink: 0, padding: '12px 20px 20px',
          borderTop: `1px solid ${c.divider}`,
          display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'transparent', border: `2px solid ${c.border}`,
              borderRadius: 14, padding: '13px 20px', fontSize: 14, fontWeight: 700,
              color: c.textSec, cursor: 'pointer', minHeight: 52, fontFamily: 'Inter,sans-serif' }}>
            <X size={16} strokeWidth={2.5} /> Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: saving ? '#198754' : '#FFC107', border: 'none',
              borderRadius: 14, padding: '13px 24px', fontSize: 15, fontWeight: 800,
              color: saving ? '#fff' : '#212529', cursor: saving ? 'default' : 'pointer',
              minHeight: 52, fontFamily: 'Inter,sans-serif', transition: 'background .2s',
              boxShadow: saving ? '0 4px 16px rgba(25,135,84,0.3)' : '0 4px 16px rgba(255,193,7,0.35)' }}>
            {saving
              ? <><LoadSpinner /> Salvando...</>
              : <><Save size={17} strokeWidth={2.5} /> Salvar Passageiro</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px' }}>
      <div style={{ width: 3, height: 13, background: '#FFC107', borderRadius: 2 }} />
      <p style={{ fontSize: 10, fontWeight: 800, color: '#FFC107', letterSpacing: 1.1,
        textTransform: 'uppercase', margin: 0 }}>{label}</p>
    </div>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return (
    <p style={{ fontSize: 11, color: '#DC3545', fontWeight: 600, margin: '-8px 0 12px',
      display: 'flex', alignItems: 'center', gap: 5 }}>
      <AlertCircle size={12} strokeWidth={2.5} /> {msg}
    </p>
  );
}

function LoadSpinner() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={3} strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ─── Delete confirm dialog ────────────────────────────────────────────
function DeleteConfirm({ name, onConfirm, onCancel, c }: {
  name: string; onConfirm: () => void; onCancel: () => void;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.65)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
      backdropFilter: 'blur(4px)' }}>
      <div className="slide-up"
        style={{ background: c.card, borderRadius: 24, padding: '28px 24px',
          maxWidth: 340, width: '100%', boxShadow: '0 8px 48px rgba(0,0,0,0.4)',
          fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: 56, height: 56, background: 'rgba(220,53,69,0.12)',
          borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px' }}>
          <Trash2 size={26} color="#DC3545" strokeWidth={2} />
        </div>
        <p style={{ fontSize: 18, fontWeight: 800, color: c.text, margin: '0 0 8px', textAlign: 'center' }}>
          Remover Passageiro?
        </p>
        <p style={{ fontSize: 13, color: c.textSec, margin: '0 0 24px', textAlign: 'center', lineHeight: 1.5 }}>
          Tem certeza que deseja remover <strong style={{ color: c.text }}>{name}</strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, background: 'transparent', border: `2px solid ${c.border}`,
              borderRadius: 13, padding: '12px', fontSize: 14, fontWeight: 700,
              color: c.textSec, cursor: 'pointer', minHeight: 48, fontFamily: 'Inter,sans-serif' }}>
            Cancelar
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, background: '#DC3545', border: 'none',
              borderRadius: 13, padding: '12px', fontSize: 14, fontWeight: 700,
              color: '#fff', cursor: 'pointer', minHeight: 48, fontFamily: 'Inter,sans-serif',
              boxShadow: '0 4px 16px rgba(220,53,69,0.35)' }}>
            Sim, Remover
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FAB ──────────────────────────────────────────────────────────────
function FAB({ onClick, isDesktop }: { onClick: () => void; isDesktop: boolean }) {
  return (
    <button onClick={onClick}
      className="touch-scale"
      style={{ position: 'fixed',
        bottom: isDesktop ? 32 : 82,
        right: isDesktop ? 36 : 20,
        width: 58, height: 58, borderRadius: 18,
        background: 'linear-gradient(135deg,#FFC107,#E6A800)',
        border: 'none', cursor: 'pointer', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 24px rgba(255,193,7,0.55), 0 2px 8px rgba(0,0,0,0.2)',
        transition: 'transform 0.15s, box-shadow 0.15s' }}
      aria-label="Adicionar novo passageiro"
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 10px 32px rgba(255,193,7,0.65), 0 4px 12px rgba(0,0,0,0.25)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 6px 24px rgba(255,193,7,0.55), 0 2px 8px rgba(0,0,0,0.2)';
      }}
    >
      <Plus size={28} color="#212529" strokeWidth={3} />
    </button>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────
export function RouteScreen() {
  const c              = useColors();
  const { isDesktop, isLg, isMd, isXxl, width }  = useBreakpoints();
  const { openDrawer } = useNavDrawer();

  // ── Local passenger list state (starts with seeded data) ──────────
  const [list, setList] = useState<Passenger[]>(() =>
    SEED.map(p => ({ ...p }))
  );

  // ── UI state ──────────────────────────────────────────────────────
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState<FilterTab>('all');
  const [period,  setPeriod]  = useState<Period>('all');
  const [modal,   setModal]   = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Passenger | null>(null);
  const [delTarget, setDelTarget] = useState<Passenger | null>(null);

  // ── Computed ──────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    all:     list.length,
    going:   list.filter(p => p.status === 'going').length,
    absent:  list.filter(p => p.status === 'absent').length,
    pending: list.filter(p => p.status === 'pending').length,
  }), [list]);

  const filtered = useMemo(() => {
    let l = [...list];
    if (period !== 'all') l = l.filter(p => p.routes.includes(period as RouteType));
    if (filter !== 'all') l = l.filter(p => p.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      l = l.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.parentName.toLowerCase().includes(q));
    }
    const ord: Record<StudentStatus, number> = { going: 0, pending: 1, absent: 2 };
    return l.sort((a, b) => ord[a.status] - ord[b.status]);
  }, [list, search, filter, period]);

  const periodSummary = useMemo(() =>
    getSummary(period === 'all' ? list : list.filter(p => p.routes.includes(period as RouteType))),
    [list, period]);

  // ── Handlers ──────────────────────────────────────────────────────
  const openAdd  = () => { setEditing(null); setModal('add'); };
  const openEdit = (p: Passenger) => { setEditing(p); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = useCallback((form: PassengerForm, id?: number) => {
    if (id !== undefined) {
      // Edit
      setList(prev => prev.map(p =>
        p.id === id
          ? {
              ...p,
              name:         form.name,
              parentName:   form.parentName,
              address:      form.address,
              neighborhood: form.neighborhood,
              phone:        form.phone,
              grade:        form.grade,
              routes:       form.routes,
              initials:     initials(form.name),
            }
          : p
      ));
    } else {
      // Add
      const newP: Passenger = {
        id:           nextId(),
        name:         form.name,
        initials:     initials(form.name),
        address:      form.address,
        neighborhood: form.neighborhood,
        phone:        form.phone,
        parentName:   form.parentName,
        status:       'pending',
        stopOrder:    list.length + 1,
        routes:       form.routes,
        grade:        form.grade,
      };
      setList(prev => [...prev, newP]);
    }
    closeModal();
  }, [list.length]);

  const handleDelete = useCallback((id: number) => {
    setList(prev => prev.filter(p => p.id !== id));
    setDelTarget(null);
  }, []);

  const px = isDesktop ? 32 : isMd ? 24 : 16;

  // Responsive card columns: 3 at xxl, 2 at md+, 1 on mobile
  const cardCols = isXxl ? 'repeat(3,1fr)' : isMd ? 'repeat(2,1fr)' : '1fr';

  return (
    <div style={{ background: c.bg, minHeight: '100%', transition: 'background 0.3s', position: 'relative' }}>

      {/* ── Scrolling header — flows naturally with page content ── */}
      <div style={{ background: '#212529', paddingTop: 16, paddingBottom: 12 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          padding: `0 ${px}px 12px` }}>
          {/* Hamburger — only when sidebar is hidden */}
          {!isLg && (
            <button onClick={openDrawer} className="touch-scale"
              aria-label="Abrir menu de navegação"
              style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer' }}>
              <Menu size={18} color="rgba(255,255,255,0.8)" strokeWidth={2} />
            </button>
          )}
          <div style={{ width: 36, height: 36, background: '#FFC107', borderRadius: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapPin size={18} color="#212529" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1 }}>
              Rotas & Passageiros
            </h1>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              {list.length} cadastrados · {periodSummary.going} vão · {periodSummary.pending} pendentes
            </p>
          </div>
          <button onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 5,
              background: '#FFC107', border: 'none', borderRadius: 12,
              padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#212529',
              cursor: 'pointer', minHeight: 38, fontFamily: 'Inter, sans-serif' }}
            aria-label="Adicionar passageiro">
            <Plus size={15} strokeWidth={3} /> Adicionar
          </button>
        </div>

        {/* Period tabs */}
        <div style={{ display: 'flex', gap: 8, padding: `0 ${px}px 12px`, overflowX: 'auto' }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                background: period === p.key ? '#FFC107' : 'rgba(255,255,255,0.08)',
                border: 'none', borderRadius: 10, padding: '8px 14px',
                fontSize: 12, fontWeight: 700,
                color: period === p.key ? '#212529' : 'rgba(255,255,255,0.55)',
                cursor: 'pointer', minHeight: 38, fontFamily: 'Inter, sans-serif' }}>
              <span>{p.emoji}</span>{p.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', padding: `0 ${px}px 10px` }}>
          <Search size={16} color="rgba(255,255,255,0.35)"
            style={{ position: 'absolute', left: px + 13, top: '50%', transform: 'translateY(-62%)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, endereço ou responsável..."
            style={{ width: '100%', background: 'rgba(255,255,255,0.09)',
              border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 14,
              padding: '12px 42px 12px 40px', fontSize: 13, color: '#fff',
              outline: 'none', fontFamily: 'Inter, sans-serif',
              minHeight: 48, boxSizing: 'border-box' }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: px + 10, top: '50%', transform: 'translateY(-62%)',
                background: 'rgba(255,255,255,0.15)', border: 'none', width: 24, height: 24,
                borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={13} color="rgba(255,255,255,0.7)" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, padding: `0 ${px}px`, overflowX: 'auto' }}>
          <Chip label="Todos"      count={counts.all}     active={filter === 'all'}     color="#6C757D" onClick={() => setFilter('all')} />
          <Chip label="✓ Vai"      count={counts.going}   active={filter === 'going'}   color="#198754" onClick={() => setFilter('going')} />
          <Chip label="✗ Não Vai"  count={counts.absent}  active={filter === 'absent'}  color="#DC3545" onClick={() => setFilter('absent')} />
          <Chip label="⏳ Pendente" count={counts.pending} active={filter === 'pending'} color="#FD7E14" onClick={() => setFilter('pending')} />
        </div>
      </div>

      {/* ── Summary bar ───────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', background: c.card,
        borderBottom: `1px solid ${c.divider}`, transition: 'background 0.3s' }}>
        {[
          { n: periodSummary.going,   color: '#198754', label: 'VAI',     I: CheckCircle2 },
          { n: periodSummary.absent,  color: '#DC3545', label: 'AUSENTE', I: XCircle },
          { n: periodSummary.pending, color: '#FD7E14', label: 'PEND.',   I: Clock },
        ].map((item, i) => (
          <div key={item.label}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '10px 0',
              borderRight: i < 2 ? `1px solid ${c.divider}` : 'none', gap: 3 }}>
            <item.I size={13} color={item.color} strokeWidth={2.5} />
            <span style={{ fontSize: 18, fontWeight: 900, color: item.color, lineHeight: 1 }}>
              {item.n}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: c.textMuted, letterSpacing: 0.6 }}>
              {item.label}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '10px 14px', gap: 3 }}>
          <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%',
            background: '#4ADE80', display: 'inline-block' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: '#4ADE80', letterSpacing: 0.6 }}>
            AO VIVO
          </span>
        </div>
      </div>

      {/* ── Passenger grid ────────────────────────── */}
      <div style={{ padding: `${isDesktop ? 20 : 16}px ${px}px ${isDesktop ? 40 : 96}px` }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '64px 24px', gap: 16 }}>
            <span style={{ fontSize: 52 }}>🔍</span>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: c.text, margin: '0 0 6px' }}>
                Nenhum passageiro encontrado
              </p>
              <p style={{ fontSize: 13, color: c.textSec, margin: 0 }}>
                Ajuste os filtros ou adicione um novo passageiro
              </p>
            </div>
            <button onClick={openAdd}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFC107',
                border: 'none', borderRadius: 14, padding: '13px 24px',
                fontSize: 14, fontWeight: 700, color: '#212529', cursor: 'pointer',
                minHeight: 50, fontFamily: 'Inter, sans-serif',
                boxShadow: '0 4px 16px rgba(255,193,7,0.35)' }}>
              <Plus size={18} strokeWidth={3} /> Adicionar Passageiro
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: cardCols, gap: 12 }}>
            {filtered.map((p, i) => (
              <PassengerCard key={p.id} passenger={p} idx={i} c={c}
                onEdit={openEdit}
                onDelete={pid => setDelTarget(list.find(x => x.id === pid) ?? null)} />
            ))}
          </div>
        )}
      </div>

      {/* ── FAB ──────────────────────────────────── */}
      <FAB onClick={openAdd} isDesktop={isDesktop} />

      {/* ── Passenger modal ──────────────────────── */}
      {(modal === 'add' || modal === 'edit') && (
        <PassengerModal
          editTarget={modal === 'edit' ? editing : null}
          onSave={handleSave}
          onClose={closeModal}
          c={c}
        />
      )}

      {/* ── Delete confirm ───────────────────────── */}
      {delTarget && (
        <DeleteConfirm
          name={delTarget.name}
          onConfirm={() => handleDelete(delTarget.id)}
          onCancel={() => setDelTarget(null)}
          c={c}
        />
      )}
    </div>
  );
}