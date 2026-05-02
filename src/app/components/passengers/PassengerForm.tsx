import { useEffect, useMemo, useState } from 'react';
import {
  User, Phone, Home, BookOpen, MapPin, Hash, GraduationCap, School,
  AlertCircle, Save, Users, Edit2, X,
} from 'lucide-react';
import { FormInput } from '../shared/FormInput';
import { listarRotas } from '../../services/rotaService';
import type { RotaRow } from '../../types/database';
import type { Passenger, TipoPassageiro } from '../../types';
import type { PassengerFormValues } from '../../hooks/usePassengers';

function applyLocalDigits(local: string): string {
  const d = local.slice(0, 11);
  if (d.length === 0) return '+55 ';
  if (d.length <= 2) return `+55 (${d}`;
  if (d.length <= 7) return `+55 (${d.slice(0, 2)}) ${d.slice(2)}`;
  return `+55 (${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Para carregar número salvo no banco (sem DDI ou com DDI 55)
function phoneForDisplay(stored: string): string {
  const digits = stored.replace(/\D/g, '');
  const local = digits.length >= 12 ? digits.slice(2) : digits;
  return applyLocalDigits(local);
}

// Para aplicar máscara enquanto o usuário digita no campo formatado
function applyPhoneMask(displayValue: string): string {
  const all = displayValue.replace(/\D/g, '');
  const local = all.startsWith('55') ? all.slice(2) : all;
  return applyLocalDigits(local);
}

const SERIES_FUNDAMENTAL = [
  '1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano',
  '6º Ano', '7º Ano', '8º Ano', '9º Ano',
] as const;

const SERIES_MEDIO = ['1º Médio', '2º Médio', '3º Médio'] as const;

const SEMESTRES = [
  '1º Semestre', '2º Semestre', '3º Semestre',  '4º Semestre',  '5º Semestre',
  '6º Semestre', '7º Semestre', '8º Semestre',  '9º Semestre', '10º Semestre',
] as const;

const FUNDAMENTAL_SET = new Set<string>(SERIES_FUNDAMENTAL);

/**
 * Regra de negócio: campo de responsável só aparece para Fundamental.
 * Médio e Faculdade usam o WhatsApp do próprio aluno.
 */
function isSerieFundamental(serie: string): boolean {
  return FUNDAMENTAL_SET.has(serie);
}

const BLANK: PassengerFormValues = {
  name: '',
  tipoPassageiro: 'escola',
  instituicao: '',
  serieSemestre: '',
  curso: '',
  nomeResponsavel: '',
  phone: '+55 ',
  addressRua: '', addressNumero: '', addressBairro: '', addressCep: '',
  routes: ['morning'],
  rotaId: undefined,
};

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

interface TipoCardProps {
  active: boolean;
  emoji: string;
  label: string;
  onClick: () => void;
}

function TipoCard({ active, emoji, label, onClick }: TipoCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 flex-1 rounded-[14px] px-3 py-3 cursor-pointer font-sans transition-all min-h-[78px]"
      style={{
        background: active ? 'rgba(255,193,7,0.12)' : 'var(--field)',
        border: `2px solid ${active ? '#FFC107' : 'var(--app-border)'}`,
      }}
    >
      <span className="text-[26px] leading-none">{emoji}</span>
      <span
        className="text-[12px] font-extrabold leading-tight text-center"
        style={{ color: active ? '#B07900' : 'var(--ink)' }}
      >
        {label}
      </span>
    </button>
  );
}

function Dropdown({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-field border-2 border-app-border rounded-[14px] px-3.5 py-3 text-sm font-bold text-ink outline-none mb-3 font-sans min-h-[52px]"
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
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
          name:            editTarget.name,
          tipoPassageiro:  editTarget.tipoPassageiro,
          instituicao:     editTarget.instituicao,
          serieSemestre:   editTarget.serieSemestre,
          curso:           editTarget.curso,
          nomeResponsavel: editTarget.parentName,
          phone:           phoneForDisplay(editTarget.phone),
          addressRua:      editTarget.addressRua,
          addressNumero:   editTarget.addressNumero,
          addressBairro:   editTarget.addressBairro,
          addressCep:      editTarget.addressCep,
          routes:          [...editTarget.routes],
          rotaId:          editTarget.rotaId,
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

  /**
   * Troca o tipo de passageiro: limpa só os campos exclusivos do tipo
   * anterior para evitar que dados antigos vazem no JSONB salvo.
   */
  const trocarTipo = (tipo: TipoPassageiro) => {
    setForm(f => ({
      ...f,
      tipoPassageiro: tipo,
      // Reseta série/semestre porque os domínios são diferentes
      serieSemestre: '',
      // Curso só faz sentido em faculdade
      curso: tipo === 'faculdade' ? f.curso : '',
      // Responsável só faz sentido em fundamental
      nomeResponsavel: tipo === 'escola' ? f.nomeResponsavel : '',
    }));
    setErrors({});
  };

  /**
   * Quando troca a série em "escola": se virar Médio, limpa o
   * nomeResponsavel (não é mais usado). Mantém o phone porque continua
   * sendo o número principal — só muda a quem ele pertence.
   */
  const trocarSerieEscola = (serie: string) => {
    setForm(f => ({
      ...f,
      serieSemestre: serie,
      nomeResponsavel: isSerieFundamental(serie) ? f.nomeResponsavel : '',
    }));
  };

  const handlePhoneChange = (v: string) =>
    setForm(f => ({ ...f, phone: applyPhoneMask(v) }));

  const selecionarRota = (id: string) => {
    setForm(f => ({ ...f, rotaId: id }));
  };

  /**
   * Validação contextual ao tipo + série. Único campo SEMPRE obrigatório
   * é o phone — a semântica varia, mas o campo existe nos 3 cenários.
   */
  const validate = () => {
    const e: Partial<Record<keyof PassengerFormValues, string>> = {};
    if (!form.name.trim())         e.name = 'Nome é obrigatório';
    if (!form.instituicao.trim())  e.instituicao = form.tipoPassageiro === 'faculdade'
      ? 'Nome da faculdade é obrigatório'
      : 'Nome da escola é obrigatório';
    if (!form.serieSemestre)       e.serieSemestre = form.tipoPassageiro === 'faculdade'
      ? 'Selecione o semestre'
      : 'Selecione a série';
    if (form.tipoPassageiro === 'faculdade' && !form.curso.trim()) {
      e.curso = 'Curso é obrigatório';
    }
    if (form.tipoPassageiro === 'escola' && isSerieFundamental(form.serieSemestre)) {
      if (!form.nomeResponsavel.trim()) e.nomeResponsavel = 'Nome do responsável é obrigatório';
    }
    if (form.phone.replace(/\D/g, '').length < 12) e.phone = 'WhatsApp inválido';
    if (!form.addressRua.trim())    e.addressRua    = 'Rua é obrigatória';
    if (!form.addressNumero.trim()) e.addressNumero = 'Número é obrigatório';
    if (!form.addressBairro.trim()) e.addressBairro = 'Bairro é obrigatório';
    if (!form.addressCep.trim())    e.addressCep    = 'CEP é obrigatório';
    if (!form.rotaId)               e.routes        = 'Selecione uma rota';
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

  // Derivações de UI condicional
  const isFaculdade = form.tipoPassageiro === 'faculdade';
  const isEscola    = form.tipoPassageiro === 'escola';
  const seriesEscolaOptions = useMemo(
    () => [...SERIES_FUNDAMENTAL, ...SERIES_MEDIO],
    [],
  );
  const mostrarResponsavelEscola = isEscola && isSerieFundamental(form.serieSemestre);
  const labelPhone =
    isFaculdade                          ? 'WhatsApp do Aluno'
    : mostrarResponsavelEscola           ? 'WhatsApp do Responsável'
    :                                      'WhatsApp do Aluno';

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

        <SectionDivider label="Tipo de Passageiro" />
        <div className="flex gap-2 mb-4">
          <TipoCard
            active={isEscola}
            emoji="🏫"
            label="Aluno de Escola"
            onClick={() => trocarTipo('escola')}
          />
          <TipoCard
            active={isFaculdade}
            emoji="🎓"
            label="Estudante de Faculdade"
            onClick={() => trocarTipo('faculdade')}
          />
        </div>

        <SectionDivider label="Dados do Aluno" />
        <FormInput label="Nome Completo" icon={User} value={form.name} onChange={set('name')} placeholder="Ex: Ana Beatriz Santos" required />
        {errors.name && <ErrMsg msg={errors.name} />}

        {isEscola && (
          <>
            <FormInput
              label="Nome da Escola"
              icon={School}
              value={form.instituicao}
              onChange={set('instituicao')}
              placeholder="Ex: Colégio Santa Maria"
              required
            />
            {errors.instituicao && <ErrMsg msg={errors.instituicao} />}

            <label className="block text-[12px] font-bold text-ink-soft mb-1.5 mt-1">
              Série / Ano <span className="text-danger">*</span>
            </label>
            <Dropdown
              value={form.serieSemestre}
              onChange={trocarSerieEscola}
              options={seriesEscolaOptions}
              placeholder="Selecione a série..."
            />
            {errors.serieSemestre && <ErrMsg msg={errors.serieSemestre} />}
          </>
        )}

        {isFaculdade && (
          <>
            <FormInput
              label="Nome da Faculdade"
              icon={GraduationCap}
              value={form.instituicao}
              onChange={set('instituicao')}
              placeholder="Ex: USP"
              required
            />
            {errors.instituicao && <ErrMsg msg={errors.instituicao} />}

            <FormInput
              label="Curso"
              icon={BookOpen}
              value={form.curso}
              onChange={set('curso')}
              placeholder="Ex: Engenharia da Computação"
              required
            />
            {errors.curso && <ErrMsg msg={errors.curso} />}

            <label className="block text-[12px] font-bold text-ink-soft mb-1.5 mt-1">
              Semestre <span className="text-danger">*</span>
            </label>
            <Dropdown
              value={form.serieSemestre}
              onChange={set('serieSemestre')}
              options={SEMESTRES}
              placeholder="Selecione o semestre..."
            />
            {errors.serieSemestre && <ErrMsg msg={errors.serieSemestre} />}
          </>
        )}

        <SectionDivider label="Contato" />
        {mostrarResponsavelEscola && (
          <>
            <FormInput
              label="Nome do Responsável"
              icon={User}
              value={form.nomeResponsavel}
              onChange={set('nomeResponsavel')}
              placeholder="Ex: Maria Santos"
              required
            />
            {errors.nomeResponsavel && <ErrMsg msg={errors.nomeResponsavel} />}
          </>
        )}
        <FormInput
          label={labelPhone}
          icon={Phone}
          type="tel"
          value={form.phone}
          onChange={handlePhoneChange}
          placeholder="+55 (19) 99999-9999"
          required
        />
        {errors.phone && <ErrMsg msg={errors.phone} />}

        <SectionDivider label="Endereço de Embarque" />
        <FormInput label="Rua" icon={Home} value={form.addressRua} onChange={set('addressRua')} placeholder="Ex: Rua das Flores" required />
        {errors.addressRua && <ErrMsg msg={errors.addressRua} />}
        <FormInput label="Número" icon={Hash} value={form.addressNumero} onChange={set('addressNumero')} placeholder="Ex: 123" required />
        {errors.addressNumero && <ErrMsg msg={errors.addressNumero} />}
        <FormInput label="Bairro" icon={MapPin} value={form.addressBairro} onChange={set('addressBairro')} placeholder="Ex: Jardim América" required />
        {errors.addressBairro && <ErrMsg msg={errors.addressBairro} />}
        <FormInput label="CEP" icon={MapPin} value={form.addressCep} onChange={set('addressCep')} placeholder="Ex: 01310-100" required />
        {errors.addressCep && <ErrMsg msg={errors.addressCep} />}

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
