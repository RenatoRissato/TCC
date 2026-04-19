import { useState } from 'react';
import { User, Phone, Mail, Car, X, Save, CheckCircle2 } from 'lucide-react';
import { BottomSheetModal } from '../shared/BottomSheetModal';
import { FormInput } from '../shared/FormInput';

interface ProfileUser {
  name?: string;
  email?: string;
  phone?: string;
  plate?: string;
  vehicle?: string;
}

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isDesktop: boolean;
  user: ProfileUser | null;
}

export function ProfileEditModal({ open, onOpenChange, isDesktop, user }: ProfileEditModalProps) {
  const [name,  setName]  = useState(user?.name    ?? 'Carlos Andrade');
  const [phone, setPhone] = useState(user?.phone   ?? '+55 11 99999-0001');
  const [email, setEmail] = useState(user?.email   ?? 'carlos@smartroutes.app');
  const [plate, setPlate] = useState(user?.plate   ?? 'BRA-2E19');
  const [veh,   setVeh]   = useState(user?.vehicle ?? 'Mercedes Sprinter 415 CDI · 2022');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onOpenChange(false); }, 1200);
  };

  return (
    <BottomSheetModal open={open} onOpenChange={onOpenChange} title="Editar Perfil" hideHandle maxWidth={isDesktop ? 520 : 560}>
      <div className="flex flex-col max-h-[92dvh] font-sans">
        <div className="shrink-0 px-5 pt-[18px] pb-4 border-b border-divider">
          <div className="w-10 h-1 rounded-sm bg-divider mx-auto mb-4" />
          <div className="flex items-center gap-3">
            <div className="w-[46px] h-[46px] rounded-[15px] flex items-center justify-center bg-pending/15">
              <User size={22} className="text-pending" strokeWidth={2} />
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
          {saved && (
            <div className="slide-up flex items-center gap-2.5 bg-success/10 border-[1.5px] border-success/30 rounded-xl px-3.5 py-3 mb-4">
              <CheckCircle2 size={18} className="text-success" strokeWidth={2.5} />
              <p className="text-[13px] font-semibold text-success m-0">Perfil atualizado com sucesso!</p>
            </div>
          )}

          <div className={`grid gap-0 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className={isDesktop ? 'pr-2.5' : ''}>
              <FormInput label="Nome Completo" icon={User} value={name} onChange={setName} placeholder="Seu nome completo" />
            </div>
            <div className={isDesktop ? 'pl-2.5' : ''}>
              <FormInput label="WhatsApp" icon={Phone} type="tel" value={phone} onChange={setPhone} placeholder="+55 (11) 99999-0000" />
            </div>
            <div className={isDesktop ? 'pr-2.5' : ''}>
              <FormInput label="E-mail" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="seu@email.com" />
            </div>
            <div className={isDesktop ? 'pl-2.5' : ''}>
              <FormInput label="Placa do Veículo" icon={Car} value={plate} onChange={setPlate} placeholder="BRA-2E19" />
            </div>
          </div>
          <FormInput label="Descrição do Veículo" icon={Car} value={veh} onChange={setVeh} placeholder="Ex: Mercedes Sprinter 415 CDI · 2022" />
          <div className="h-2" />
        </div>

        <div className="shrink-0 px-5 pt-3 pb-5 border-t border-divider flex gap-2.5">
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center gap-1.5 bg-transparent border-2 border-app-border rounded-[14px] px-5 py-3 text-sm font-bold text-ink-soft cursor-pointer min-h-[52px] font-sans"
          >
            <X size={16} strokeWidth={2.5} /> Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex-1 flex items-center justify-center gap-2 border-0 rounded-[14px] px-6 py-3 text-[15px] font-extrabold min-h-[52px] font-sans transition-colors"
            style={{
              background: saved ? 'var(--success)' : saving ? 'rgba(255,193,7,0.7)' : 'var(--pending)',
              color: saved ? '#fff' : '#212529',
              cursor: saving ? 'default' : 'pointer',
              boxShadow: saved
                ? '0 4px 16px rgba(25,135,84,0.3)'
                : '0 4px 16px rgba(255,193,7,0.35)',
            }}
          >
            {saved
              ? <><CheckCircle2 size={17} strokeWidth={2.5} />Salvo!</>
              : saving
              ? <>Salvando...</>
              : <><Save size={17} strokeWidth={2.5} />Salvar Perfil</>}
          </button>
        </div>
      </div>
    </BottomSheetModal>
  );
}
