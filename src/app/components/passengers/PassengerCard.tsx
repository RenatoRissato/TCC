import { memo } from 'react';
import {
  Navigation, MessageCircle, MapPin,
  CheckCircle2, XCircle, Edit2, Trash2,
} from 'lucide-react';
import { Avatar } from '../shared/Avatar';
import { StatusBadge } from '../shared/StatusBadge';
import type { Passenger, RouteType } from '../../types';

const SHIFT_OPTIONS: Record<RouteType, { label: string; emoji: string; color: string }> = {
  morning:   { label: 'Manhã',  emoji: '☀️',  color: '#FFC107' },
  afternoon: { label: 'Tarde',  emoji: '🌤️', color: '#FD7E14' },
  night:     { label: 'Noite',  emoji: '🌙',  color: '#6C5CE7' },
};

function MapsButton({ p }: { p: Passenger }) {
  const q = encodeURIComponent(p.address);
  const href = `https://maps.google.com/maps?q=${q}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="touch-scale inline-flex items-center gap-2 rounded-[12px] border px-3 py-2 text-xs font-bold no-underline transition-all min-h-10"
      style={{
        color: '#2979FF',
        borderColor: 'rgba(41,121,255,0.18)',
        background: 'rgba(41,121,255,0.08)',
      }}
      aria-label={`Abrir ${p.name} no Google Maps`}
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/75 dark:bg-[#0F141A]">
        <Navigation size={15} color="#2979FF" strokeWidth={2} />
      </span>
      <span className="flex flex-col leading-tight">
        <span>Google Maps</span>
        <span className="text-[10px] font-medium text-[#2979FF]/75">Abrir rota</span>
      </span>
    </a>
  );
}

interface PassengerCardProps {
  passenger: Passenger;
  idx: number;
  onEdit: (p: Passenger) => void;
  onDelete: (p: Passenger) => void;
}

export const PassengerCard = memo(function PassengerCard({
  passenger: p, idx, onEdit, onDelete,
}: PassengerCardProps) {
  const absent = p.status === 'absent';
  const waUrl = `https://wa.me/${p.phone}?text=${encodeURIComponent(
    `Olá ${p.parentName}! Confirma presença de ${p.name.split(' ')[0]} hoje? 🚌`,
  )}`;
  return (
    <div
      className={`slide-up stagger-${Math.min(idx + 1, 5)} bg-panel rounded-[20px] overflow-hidden transition-all ${
        absent
          ? 'opacity-55 [filter:grayscale(0.3)] border-[1.5px] border-app-border'
          : 'border-[1.5px] border-app-border shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)]'
      }`}
    >
      <div className="flex items-center gap-3 pt-3.5 px-4 pb-3">
        <Avatar initials={p.initials} status={p.status} size={48} badge={p.stopOrder} />
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] font-bold m-0 mb-[3px] truncate ${absent ? 'text-ink-muted' : 'text-ink'}`}>
            {p.name}
          </p>
          <div className="flex items-center gap-1">
            <MapPin size={11} strokeWidth={2} className={absent ? 'text-ink-muted' : 'text-ink-soft'} />
            <p className={`text-xs font-medium m-0 truncate ${absent ? 'text-ink-muted' : 'text-ink-soft'}`}>
              {p.address}
            </p>
          </div>
          <p className="text-[11px] font-medium text-ink-muted m-0 mt-0.5">
            {[p.addressBairro, p.grade].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={p.status} size="md" />
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(p)}
              className="w-7 h-7 rounded-lg bg-[rgba(41,121,255,0.1)] border border-[rgba(41,121,255,0.2)] cursor-pointer flex items-center justify-center"
              aria-label="Editar passageiro"
            >
              <Edit2 size={13} color="#2979FF" strokeWidth={2.5} />
            </button>
            <button
              onClick={() => onDelete(p)}
              className="w-7 h-7 rounded-lg bg-danger/10 border border-danger/20 cursor-pointer flex items-center justify-center"
              aria-label="Remover passageiro"
            >
              <Trash2 size={13} className="text-danger" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 px-4 pb-2">
        {p.routes.map((r) => {
          const sh = SHIFT_OPTIONS[r];
          return (
            <span
              key={r}
              className="text-[10px] font-bold px-[7px] py-0.5 rounded-md border"
              style={{ background: `${sh.color}18`, color: sh.color, borderColor: `${sh.color}30` }}
            >
              {sh.emoji} {sh.label}
            </span>
          );
        })}
      </div>

      {p.responseTime && (
        <div
          className="flex items-center gap-1.5 py-1.5 px-4"
          style={{ background: p.status === 'going' ? 'rgba(25,135,84,0.07)' : 'rgba(220,53,69,0.05)' }}
        >
          {p.status === 'going'
            ? <CheckCircle2 size={13} className="text-success" strokeWidth={2.5} />
            : <XCircle size={13} className="text-danger" strokeWidth={2.5} />}
          <p className={`text-[11px] font-semibold m-0 ${p.status === 'going' ? 'text-success' : 'text-danger'}`}>
            Respondido às {p.responseTime} via WhatsApp
          </p>
        </div>
      )}
      {p.status === 'pending' && (
        <div className="flex items-center gap-1.5 py-1.5 px-4 bg-warning/[0.08]">
          <span className="pulse-dot inline-block w-[7px] h-[7px] rounded-full bg-warning" />
          <p className="text-[11px] font-semibold m-0 text-[#C56A00] dark:text-warning">
            Aguardando resposta...
          </p>
        </div>
      )}

      <div className="h-px bg-divider mx-4" />

      <div className="flex items-center gap-2.5 px-4 pt-3 pb-3.5">
        <MapsButton p={p} />
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="touch-scale inline-flex items-center gap-2 rounded-[12px] border px-3 py-2 text-xs font-bold no-underline transition-all min-h-10"
          style={{
            color: '#128C7E',
            borderColor: 'rgba(18,140,126,0.18)',
            background: 'rgba(18,140,126,0.08)',
          }}
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/75 dark:bg-[#0F141A]">
            <MessageCircle size={15} color="#128C7E" strokeWidth={2} />
          </span>
          <span className="flex flex-col leading-tight">
            <span>WhatsApp</span>
            <span className="text-[10px] font-medium text-[#128C7E]/75">Falar agora</span>
          </span>
        </a>
        <span className="ml-auto text-[11px] text-ink-muted font-medium">
          {p.parentName.split(' ')[0]}
        </span>
      </div>
    </div>
  );
});
