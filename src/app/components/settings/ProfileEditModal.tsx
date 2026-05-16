import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  User as UserIcon,
  Phone,
  Mail,
  Car,
  X,
  Save,
  AlertCircle,
  ChevronDown,
  Camera,
} from 'lucide-react';
import { BottomSheetModal } from '../shared/BottomSheetModal';
import { FormInput } from '../shared/FormInput';
import { Spinner } from '../whatsapp/Spinner';
import { useAuth } from '../../context/AuthContext';
import { atualizarPerfilMotorista } from '../../services/motoristaService';
import { supabase } from '../../../lib/supabase';
import type { User } from '../../types';

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isDesktop: boolean;
  user: User | null;
}

const VEHICLE_BRANDS = [
  'Mercedes-Benz',
  'Fiat',
  'Renault',
  'Peugeot',
  'Citroen',
  'Volkswagen',
  'Iveco',
  'Ford',
  'Kia',
  'Hyundai',
];

const CURRENT_YEAR = new Date().getFullYear();
const VEHICLE_YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, index) =>
  String(CURRENT_YEAR - index),
);

function normalizarTelefone(input: string): string {
  return input.replace(/\D/g, '');
}

function formatarTelefoneBR(input: string): string {
  const digitos = normalizarTelefone(input).slice(0, 11);
  if (digitos.length === 0) return '';
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

function formatarPlacaBR(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  if (raw.length <= 3) return raw;
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

function extensaoImagem(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return ext === 'jpg' ? 'jpeg' : ext;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpeg';
}

function SelectField({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <div className="mb-[14px]">
      <label className="flex items-center gap-[5px] text-xs font-bold text-ink-soft mb-1.5">
        <Car size={13} strokeWidth={2} className="text-ink-muted" />
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={[
            'w-full box-border appearance-none bg-field border-2 border-field-border rounded-[13px]',
            'px-3.5 py-3 pr-10 text-sm font-medium text-ink outline-none min-h-[50px]',
            'transition-colors focus:border-pending focus:shadow-[0_0_0_3px_rgba(255,193,7,0.12)]',
            value ? '' : 'text-ink-muted',
          ].join(' ')}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={2.5}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
        />
      </div>
    </div>
  );
}

export function ProfileEditModal({ open, onOpenChange, isDesktop, user }: ProfileEditModalProps) {
  const { recarregarMotorista, motoristaId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? '');
    setPhone(formatarTelefoneBR(user?.phone ?? ''));
    setPlate(formatarPlacaBR(user?.plate ?? ''));
    setMarca(user?.vehicleBrand ?? '');
    setModelo(user?.vehicleModel ?? '');
    setAno(user?.vehicleYear ? String(user.vehicleYear) : '');
    setFotoUrl(user?.avatar ?? null);
    setFotoPreview(user?.avatar ?? null);
    setFotoArquivo(null);
    setErro(null);
  }, [open, user]);

  const handleFotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErro('Escolha um arquivo de imagem valido.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setErro('A foto precisa ter no maximo 3 MB.');
      return;
    }
    setErro(null);
    setFotoArquivo(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const uploadFoto = async (): Promise<string | null> => {
    if (!fotoArquivo || !motoristaId) return fotoUrl;
    const ext = extensaoImagem(fotoArquivo);
    const path = `${motoristaId}/perfil-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('profile-photos')
      .upload(path, fotoArquivo, {
        cacheControl: '3600',
        upsert: true,
        contentType: fotoArquivo.type || `image/${ext}`,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!motoristaId) {
      setErro('Perfil do motorista nao carregado.');
      return;
    }
    if (!name.trim() || name.trim().length < 3) {
      setErro('Nome precisa ter ao menos 3 caracteres.');
      return;
    }
    if (!phone.trim()) {
      setErro('WhatsApp e obrigatorio.');
      return;
    }

    const phoneDigits = normalizarTelefone(phone);
    if (![10, 11].includes(phoneDigits.length)) {
      setErro('WhatsApp precisa ter DDD e 10 ou 11 digitos.');
      return;
    }

    if (!plate.trim()) {
      setErro('Placa do veiculo e obrigatoria.');
      return;
    }
    const plateRaw = plate.replace(/[^A-Za-z0-9]/g, '');
    if (plateRaw.length !== 7) {
      setErro('Placa do veiculo precisa ter 7 caracteres.');
      return;
    }

    if (!marca.trim()) {
      setErro('Marca da van e obrigatoria.');
      return;
    }
    if (!modelo.trim()) {
      setErro('Modelo da van e obrigatorio.');
      return;
    }
    if (!ano.trim()) {
      setErro('Ano da van e obrigatorio.');
      return;
    }

    const anoNum = ano.trim() ? Number.parseInt(ano.trim(), 10) : null;
    if (ano.trim() && (Number.isNaN(anoNum) || anoNum! < 1980 || anoNum! > 2100)) {
      setErro('Ano do veiculo invalido.');
      return;
    }

    setErro(null);
    setSalvando(true);
    let proximaFotoUrl: string | null = fotoUrl;
    try {
      proximaFotoUrl = await uploadFoto();
    } catch (error) {
      setSalvando(false);
      const mensagem = error instanceof Error ? error.message : 'Falha ao enviar a foto.';
      setErro(mensagem);
      toast.error('Nao foi possivel enviar a foto.', { description: mensagem });
      return;
    }

    const r = await atualizarPerfilMotorista({
      motoristaId,
      nome: name.trim(),
      telefone: phone.trim() ? phoneDigits : null,
      placaVan: plate.trim() || null,
      marcaVan: marca.trim() || null,
      modeloVan: modelo.trim() || null,
      anoVan: anoNum,
      fotoUrl: proximaFotoUrl,
    });
    setSalvando(false);

    if (!r.ok) {
      setErro(r.erro ?? 'Erro ao salvar. Tente novamente.');
      toast.error('Nao foi possivel salvar o perfil.', { description: r.erro });
      return;
    }
    await recarregarMotorista();
    toast.success('Perfil atualizado com sucesso.');
    onOpenChange(false);
  };

  return (
    <BottomSheetModal open={open} onOpenChange={onOpenChange} title="Editar Perfil" hideHandle maxWidth={isDesktop ? 520 : 560}>
      <div className="flex flex-col max-h-[92dvh] font-sans">
        <div className="shrink-0 px-5 pt-[18px] pb-4 border-b border-divider">
          <div className="w-10 h-1 rounded-sm bg-divider mx-auto mb-4" />
          <div className="flex items-center gap-3">
            <div className="w-[46px] h-[46px] rounded-[15px] flex items-center justify-center bg-pending/15">
              <UserIcon size={22} className="text-pending" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="text-lg font-extrabold text-ink m-0 leading-tight">Editar Perfil</p>
              <p className="text-xs text-ink-soft m-0">Atualize suas informacoes pessoais</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
              className="w-9 h-9 rounded-[11px] bg-field border border-app-border cursor-pointer flex items-center justify-center"
            >
              <X size={18} className="text-ink-soft" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-2 [-webkit-overflow-scrolling:touch]">
          {erro && (
            <div className="slide-up flex items-center gap-2.5 bg-danger/10 border-[1.5px] border-danger/30 rounded-xl px-3.5 py-3 mb-4">
              <AlertCircle size={18} className="text-danger" strokeWidth={2.5} />
              <p className="text-[13px] font-semibold text-danger m-0">{erro}</p>
            </div>
          )}

          <div className="flex items-center gap-3 mb-5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-[76px] h-[76px] rounded-[22px] overflow-hidden border-2 border-field-border bg-field flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Alterar foto de perfil"
            >
              {fotoPreview ? (
                <img src={fotoPreview} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={30} className="text-ink-muted" strokeWidth={2.2} />
              )}
              <span className="absolute right-1.5 bottom-1.5 w-7 h-7 rounded-[10px] bg-pending text-[#212529] flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
                <Camera size={14} strokeWidth={2.6} />
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-ink m-0">Foto de perfil</p>
              <p className="text-[11px] text-ink-soft m-0 leading-[1.45]">
                JPG, PNG ou WebP ate 3 MB.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-3 py-2 rounded-[11px] border border-app-border bg-field text-xs font-bold text-ink-soft cursor-pointer"
              >
                Escolher foto
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFotoChange}
                className="hidden"
              />
            </div>
          </div>

          <div className={`grid gap-0 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className={isDesktop ? 'pr-2.5' : ''}>
              <FormInput label="Nome Completo" icon={UserIcon} value={name} onChange={setName} placeholder="Seu nome completo" />
            </div>
            <div className={isDesktop ? 'pl-2.5' : ''}>
              <FormInput
                label="WhatsApp"
                icon={Phone}
                type="tel"
                value={phone}
                onChange={(v) => setPhone(formatarTelefoneBR(v))}
                placeholder="(99) 99999-9999"
              />
            </div>
            <div className={isDesktop ? 'pr-2.5' : ''}>
              <FormInput label="E-mail" icon={Mail} type="email" value={user?.email ?? ''} onChange={() => undefined} placeholder="seu@email.com" disabled />
            </div>
            <div className={isDesktop ? 'pl-2.5' : ''}>
              <FormInput
                label="Placa do Veiculo"
                icon={Car}
                value={plate}
                onChange={(v) => setPlate(formatarPlacaBR(v))}
                placeholder="ABC-1234 ou BRA-2E19"
              />
            </div>
          </div>
          <div className={`grid gap-0 ${isDesktop ? 'grid-cols-3' : 'grid-cols-1'}`}>
            <div className={isDesktop ? 'pr-2.5' : ''}>
              <SelectField
                label="Marca"
                value={marca}
                onChange={setMarca}
                placeholder="Selecione a marca"
                options={VEHICLE_BRANDS}
              />
            </div>
            <div className={isDesktop ? 'px-1.5' : ''}>
              <FormInput label="Modelo" icon={Car} value={modelo} onChange={setModelo} placeholder="Sprinter 415 CDI" />
            </div>
            <div className={isDesktop ? 'pl-2.5' : ''}>
              <SelectField
                label="Ano"
                value={ano}
                onChange={setAno}
                placeholder="Selecione o ano"
                options={VEHICLE_YEARS}
              />
            </div>
          </div>
          <div className="h-2" />
        </div>

        <div className="shrink-0 px-5 pt-3 pb-5 border-t border-divider flex gap-2.5">
          <button
            onClick={() => onOpenChange(false)}
            disabled={salvando}
            className="flex items-center justify-center gap-1.5 bg-transparent border-2 border-app-border rounded-[14px] px-5 py-3 text-sm font-bold text-ink-soft cursor-pointer min-h-[52px] font-sans disabled:opacity-50"
          >
            <X size={16} strokeWidth={2.5} /> Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={salvando}
            className="flex-1 flex items-center justify-center gap-2 border-0 rounded-[14px] px-6 py-3 text-[15px] font-extrabold min-h-[52px] font-sans transition-colors disabled:opacity-70"
            style={{
              background: 'var(--pending)',
              color: '#212529',
              cursor: salvando ? 'default' : 'pointer',
              boxShadow: '0 4px 16px rgba(255,193,7,0.35)',
            }}
          >
            {salvando
              ? <><Spinner size={17} />Salvando...</>
              : <><Save size={17} strokeWidth={2.5} />Salvar Perfil</>}
          </button>
        </div>
      </div>
    </BottomSheetModal>
  );
}
