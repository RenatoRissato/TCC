import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  User as UserIcon, Phone, Mail, Car, X, Save, AlertCircle,
} from 'lucide-react';
import { BottomSheetModal } from '../shared/BottomSheetModal';
import { FormInput } from '../shared/FormInput';
import { Spinner } from '../whatsapp/Spinner';
import { useAuth } from '../../context/AuthContext';
import { atualizarPerfilMotorista } from '../../services/motoristaService';
import type { User } from '../../types';

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isDesktop: boolean;
  user: User | null;
}

function normalizarTelefone(input: string): string {
  return input.replace(/\D/g, '');
}

export function ProfileEditModal({ open, onOpenChange, isDesktop, user }: ProfileEditModalProps) {
  const { recarregarMotorista, motoristaId } = useAuth();

  const [name,  setName]  = useState('');
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Resync com user toda vez que o modal abrir — garante que cancelar e
  // reabrir mostre os valores persistidos.
  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
    setPlate(user?.plate ?? '');
    setMarca(user?.vehicleBrand ?? '');
    setModelo(user?.vehicleModel ?? '');
    setAno(user?.vehicleYear ? String(user.vehicleYear) : '');
    setErro(null);
  }, [open, user]);

  const handleSave = async () => {
    if (!motoristaId) {
      setErro('Perfil do motorista não carregado.');
      return;
    }
    if (!name.trim() || name.trim().length < 3) {
      setErro('Nome precisa ter ao menos 3 caracteres.');
      return;
    }
    const anoNum = ano.trim() ? Number.parseInt(ano.trim(), 10) : null;
    if (ano.trim() && (Number.isNaN(anoNum) || anoNum! < 1980 || anoNum! > 2100)) {
      setErro('Ano do veículo inválido.');
      return;
    }

    setErro(null);
    setSalvando(true);
    const r = await atualizarPerfilMotorista({
      motoristaId,
      nome: name.trim(),
      telefone: phone.trim() ? normalizarTelefone(phone) : null,
      placaVan: plate.trim() || null,
      marcaVan: marca.trim() || null,
      modeloVan: modelo.trim() || null,
      anoVan: anoNum,
    });
    setSalvando(false);

    if (!r.ok) {
      setErro(r.erro ?? 'Erro ao salvar. Tente novamente.');
      toast.error('Não foi possível salvar o perfil.', { description: r.erro });
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
              <p className="text-xs text-ink-soft m-0">Atualize suas informações pessoais</p>
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

          <div className={`grid gap-0 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className={isDesktop ? 'pr-2.5' : ''}>
              <FormInput label="Nome Completo" icon={UserIcon} value={name} onChange={setName} placeholder="Seu nome completo" />
            </div>
            <div className={isDesktop ? 'pl-2.5' : ''}>
              <FormInput label="WhatsApp" icon={Phone} type="tel" value={phone} onChange={setPhone} placeholder="+55 (11) 99999-0000" />
            </div>
            <div className={isDesktop ? 'pr-2.5' : ''}>
              <FormInput label="E-mail" icon={Mail} type="email" value={user?.email ?? ''} onChange={() => undefined} placeholder="seu@email.com" disabled />
            </div>
            <div className={isDesktop ? 'pl-2.5' : ''}>
              <FormInput label="Placa do Veículo" icon={Car} value={plate} onChange={setPlate} placeholder="BRA-2E19" />
            </div>
          </div>
          <div className={`grid gap-0 ${isDesktop ? 'grid-cols-3' : 'grid-cols-1'}`}>
            <div className={isDesktop ? 'pr-2.5' : ''}>
              <FormInput label="Marca" icon={Car} value={marca} onChange={setMarca} placeholder="Mercedes" />
            </div>
            <div className={isDesktop ? 'px-1.5' : ''}>
              <FormInput label="Modelo" icon={Car} value={modelo} onChange={setModelo} placeholder="Sprinter 415 CDI" />
            </div>
            <div className={isDesktop ? 'pl-2.5' : ''}>
              <FormInput label="Ano" icon={Car} type="number" value={ano} onChange={setAno} placeholder="2022" />
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
