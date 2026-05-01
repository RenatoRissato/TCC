import { useEffect, useState } from 'react';
import {
  User, Phone, Home, BookOpen, MapPin, CheckCircle2,
  AlertCircle, Save, Users, Edit2, X,
} from 'lucide-react';
import { FormInput } from '../shared/FormInput';
import { listarRotas } from '../../services/rotaService';
import type { RotaRow } from '../../types/database';
import type { Passenger, RouteType } from '../../types';
import type { PassengerFormValues } from '../../hooks/usePassengers';

const BLANK: PassengerFormValues = {
  name: '', parentName: '', address: '', neighborhood: '',
  phone: '', grade: '', routes: ['morning'], rotaId: undefined,
};

const SHIFT_OPTIONS: { key: RouteType; label: string; emoji: string; color: string; time: string }[] = [
  { key: 'morning',   label: 'Manhã',  emoji: '☀️',  color: '#FFC107', time: '07:15' },
  { key: 'afternoon', label: 'Tarde',  emoji: '🌤️', color: '#FD7E14', time: '12:30' },
  { key: 'night',     label: 'Noite',  emoji: '🌙',  color: '#6C5CE7', time: '19:00' },
];

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mt-1 mb-3">
      <div className="w-[3px] h-[13px] bg-pending rounded-sm" />
      <p className="text-[10px] font-extrabold text-pending tracking-[0.11em] uppercase m-0">{label}</p>
    </div>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return (
    <p className="text-[11px] font-semibold text-danger m-0 -mt-2 mb-3 flex items-center gap-[5px]">
      <AlertCircle size={12} strokeWidth={2.5} /> {msg}
    </p>
  );
}

function LoadSpinner() {
  return (
    <svg
      width={17} height={17} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={3} strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

interface PassengerFormProps {
  editTarget: Passenger | null;
  onSave: (values: PassengerFormValues, id?: string) => void;
  onClose: () => void;
}

export function PassengerForm({ editTarget, onSave, onClose }: PassengerFormProps) {
  const isEdit = editTarget !== null;
  const [rotas, setRotas] = useState<RotaRow[]>([]);
  const [form, setForm] = useState<PassengerFormValues>(
    isEdit
      ? {
          name:         editTarget.name,
          parentName:   editTarget.parentName,
          address:      editTarget.address,
          neighborhood: editTarget.neighborhood,
          phone:        editTarget.phone,
          grade:        editTarget.grade,
          routes:       [...editTarget.routes],
          rotaId:       editTarget.rotaId,
        }
      : { ...BLANK },
  );
  const [errors, setErrors] = useState<Partial<Record<keyof PassengerFormValues, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listarRotas().then(rs => {
      setRotas(rs);
      if (!isEdit && !form.rotaId && rs.length > 0) {
        const primeira = rs[0];
        setForm(f => ({ ...f, rotaId: primeira.id, routes: [primeira.turno] }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: keyof PassengerFormValues) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const selecionarRota = (id: string) => {
    const r = rotas.find(x => x.id === id);
    setForm(f => ({
      ...f,
      rotaId: id,
      routes: r ? [r.turno] : f.routes,
    }));
  };

  const toggleRoute = (r: RouteType) => {
    setForm((f) => ({
      ...f,
      routes: f.routes.includes(r) ? f.routes.filter((x) => x !== r) : [...f.routes, r],
    }));
  };

  const validate = () => {
    const e: Partial<Record<keyof PassengerFormValues, string>> = {};
    if (!form.name.trim()) e.name = 'Nome é obrigatório';
    if (!form.parentName.trim()) e.parentName = 'Responsável é obrigatório';
    if (!form.address.trim()) e.address = 'Endereço é obrigatório';
    if (form.phone.replace(/\D/g, '').length < 10) e.phone = 'WhatsApp inválido';
    if (!form.rotaId) e.routes = 'Selecione uma rota';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(form, editTarget?.id);
    } finally {
      setSaving(false);
    }
  };

  const hasError = Object.keys(errors).length > 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 font-sans">
      <div className="shrink-0 px-5 pt-4 pb-4 border-b border-divider">
        <div className="flex items-center gap-3">
          <div
            className="w-[46px] h-[46px] rounded-[15px] flex items-center justify-center"
            style={{ background: isEdit ? 'rgba(41,121,255,0.12)' : 'rgba(25,135,84,0.12)' }}
          >
            {isEdit
              ? <Edit2 size={22} color="#2979FF" strokeWidth={2} />
              : <Users size={22} color="#198754" strokeWidth={2} />}
          </div>
          <div className="flex-1">
            <p className="text-lg font-extrabold text-ink m-0 leading-tight">
              {isEdit ? 'Editar Passageiro' : 'Novo Passageiro'}
            </p>
            <p className="text-xs text-ink-soft m-0">
              {isEdit ? `Editando: ${editTarget.name.split(' ')[0]}` : 'Preencha os dados do passageiro'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-[11px] bg-field border border-app-border cursor-pointer flex items-center justify-center"
            aria-label="Fechar"
          >
            <X size={18} className="text-ink-soft" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-2 [-webkit-overflow-scrolling:touch]">
        {hasError && (
          <div className="slide-up flex items-center gap-2.5 bg-danger/[0.08] border-[1.5px] border-danger/30 rounded-[13px] px-3.5 py-[11px] mb-4">
            <AlertCircle size={16} className="text-danger" strokeWidth={2.5} />
            <p className="text-[13px] font-semibold text-danger m-0">
              Corrija os campos destacados.
            </p>
          </div>
        )}

        <SectionDivider label="Dados do Aluno" />
        <FormInput label="Nome Completo" icon={User} value={form.name} onChange={set('name')} placeholder="Ex: Ana Beatriz Santos" required />
        {errors.name && <ErrMsg msg={errors.name} />}
        <FormInput label="Série / Curso" icon={BookOpen} value={form.grade} onChange={set('grade')} placeholder="Ex: 5º Ano ou Engenharia" />

        <SectionDivider label="Responsável" />
        <FormInput label="Nome do Responsável" icon={User} value={form.parentName} onChange={set('parentName')} placeholder="Ex: Maria Santos" required />
        {errors.parentName && <ErrMsg msg={errors.parentName} />}
        <FormInput label="WhatsApp do Responsável" icon={Phone} type="tel" value={form.phone} onChange={set('phone')} placeholder="+55 (11) 99999-0000" required />
        {errors.phone && <ErrMsg msg={errors.phone} />}

        <SectionDivider label="Endereço de Embarque" />
        <FormInput label="Endereço" icon={Home} value={form.address} onChange={set('address')} placeholder="Ex: Rua das Flores, 123" required />
        {errors.address && <ErrMsg msg={errors.address} />}
        <FormInput label="Bairro" icon={MapPin} value={form.neighborhood} onChange={set('neighborhood')} placeholder="Ex: Jardim América" />

        <SectionDivider label="Rota" />
        {rotas.length === 0 ? (
          <p className="text-xs text-warning m-0 mb-3">Nenhuma rota cadastrada. Crie uma rota antes de adicionar passageiros.</p>
        ) : (
          <select
            value={form.rotaId ?? ''}
            onChange={(e) => selecionarRota(e.target.value)}
            className="w-full bg-field border-2 border-app-border rounded-[14px] px-3.5 py-3 text-sm font-bold text-ink outline-none mb-3 font-sans min-h-[52px]"
          >
            <option value="" disabled>Selecione uma rota...</option>
            {rotas.map(r => (
              <option key={r.id} value={r.id}>{r.nome} {r.horario_saida ? `· ${r.horario_saida.slice(0,5)}` : ''}</option>
            ))}
          </select>
        )}

        <SectionDivider label="Turno (referência visual)" />
        <p className="text-xs text-ink-soft m-0 mb-2.5">Sincronizado automaticamente com a rota selecionada:</p>
        <div className="flex gap-2 mb-2 flex-wrap">
          {SHIFT_OPTIONS.map((sh) => {
            const active = form.routes.includes(sh.key);
            return (
              <button
                key={sh.key}
                onClick={() => toggleRoute(sh.key)}
                className="flex items-center gap-2 flex-1 min-w-[100px] rounded-[14px] px-3.5 py-3 cursor-pointer font-sans transition-all"
                style={{
                  background: active ? `${sh.color}18` : 'var(--field)',
                  border: `2px solid ${active ? sh.color : 'var(--app-border)'}`,
                }}
              >
                <span className="text-xl">{sh.emoji}</span>
                <div className="text-left">
                  <p className="text-[13px] font-bold m-0" style={{ color: active ? sh.color : 'var(--ink)' }}>
                    {sh.label}
                  </p>
                  <p className="text-[10px] text-ink-muted m-0">{sh.time}</p>
                </div>
                {active && <CheckCircle2 size={16} color={sh.color} strokeWidth={2.5} className="ml-auto" />}
              </button>
            );
          })}
        </div>
        {errors.routes && <ErrMsg msg={errors.routes} />}

        <div className="h-4" />
      </div>

      <div className="shrink-0 px-5 pt-3 pb-5 border-t border-divider flex gap-2.5">
        <button
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 bg-transparent border-2 border-app-border rounded-[14px] px-5 py-3 text-sm font-bold text-ink-soft cursor-pointer min-h-[52px] font-sans"
        >
          <X size={16} strokeWidth={2.5} /> Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 border-0 rounded-[14px] px-6 py-3 text-[15px] font-extrabold min-h-[52px] font-sans transition-colors"
          style={{
            background: saving ? 'var(--success)' : 'var(--pending)',
            color: saving ? '#fff' : '#212529',
            cursor: saving ? 'default' : 'pointer',
            boxShadow: saving ? '0 4px 16px rgba(25,135,84,0.3)' : '0 4px 16px rgba(255,193,7,0.35)',
          }}
        >
          {saving ? (
            <><LoadSpinner /> Salvando...</>
          ) : (
            <><Save size={17} strokeWidth={2.5} /> Salvar Passageiro</>
          )}
        </button>
      </div>
    </div>
  );
}
