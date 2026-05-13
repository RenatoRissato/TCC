import { ComponentType, useState } from 'react';
import { toast } from 'sonner';
import { MessageCircle, Smartphone, Bell, Volume2, Save } from 'lucide-react';
import { Toggle } from '../shared/Toggle';
import { Spinner } from '../whatsapp/Spinner';
import { useAuth } from '../../context/AuthContext';
import { atualizarPreferenciasMotorista } from '../../services/motoristaService';
import type { SomAlerta } from '../../types';

interface ToggleRowProps {
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  iconColor: string;
  title: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}

function ToggleRow({ icon: Icon, iconColor, title, desc, value, onChange, last }: ToggleRowProps) {
  return (
    <div className={`flex items-center gap-3.5 py-[13px] ${last ? '' : 'border-b border-divider'}`}>
      <div
        className="w-[38px] h-[38px] rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${iconColor}18` }}
      >
        <Icon size={18} color={iconColor} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink m-0">{title}</p>
        <p className="text-[11px] text-ink-soft m-0 mt-0.5 leading-[1.4]">{desc}</p>
      </div>
      <Toggle value={value} onChange={onChange} color="success" />
    </div>
  );
}

export function NotificationsSection() {
  const { user, motoristaId, recarregarMotorista } = useAuth();

  // Hidrata a partir do user (já carregado pelo AuthContext).
  const [notifWA,      setNotifWA]      = useState(user?.notifWhatsApp ?? true);
  const [notifPush,    setNotifPush]    = useState(user?.notifPush ?? true);
  const [notifPending, setNotifPending] = useState(user?.notifPendentes ?? false);
  const [alertSound,   setAlertSound]   = useState<SomAlerta>(user?.somAlerta ?? 'default');
  const [salvando, setSalvando] = useState(false);

  const handleSalvar = async () => {
    if (!motoristaId) {
      toast.error('Perfil do motorista não carregado.');
      return;
    }
    setSalvando(true);
    const r = await atualizarPreferenciasMotorista({
      motoristaId,
      notifWhatsapp: notifWA,
      notifPush,
      notifPendentes: notifPending,
      somAlerta: alertSound,
    });
    setSalvando(false);
    if (!r.ok) {
      toast.error('Não foi possível salvar.', { description: r.erro });
      return;
    }
    await recarregarMotorista();
    toast.success('Preferências de notificação salvas.');
  };

  return (
    <>
      <ToggleRow
        icon={MessageCircle} iconColor="#25D366"
        title="Respostas WhatsApp (Tempo real)"
        desc="Alertas imediatos quando responsáveis responderem"
        value={notifWA} onChange={setNotifWA}
      />
      <ToggleRow
        icon={Smartphone} iconColor="#2979FF"
        title="Push Notifications"
        desc="Notificações mesmo com app em segundo plano"
        value={notifPush} onChange={setNotifPush}
      />
      <ToggleRow
        icon={Bell} iconColor="#FD7E14"
        title="Lembrete de Pendentes"
        desc="Alerta 1h antes da rota para passageiros sem resposta"
        value={notifPending} onChange={setNotifPending}
        last
      />

      <div className="pt-3.5">
        <label className="flex items-center gap-1.5 text-xs font-bold text-ink-soft mb-2">
          <Volume2 size={14} className="text-ink-muted" strokeWidth={2} />
          Som de Alerta
        </label>
        <select
          value={alertSound}
          onChange={(e) => setAlertSound(e.target.value as SomAlerta)}
          className="w-full box-border bg-field border-2 border-field-border rounded-xl px-3 py-2.5 text-sm font-medium text-ink outline-none font-sans cursor-pointer min-h-[46px]"
        >
          <option value="default">🔔 Padrão do Sistema</option>
          <option value="chime">🎵 Chime Suave</option>
          <option value="bell">🔔 Sino</option>
          <option value="ding">✨ Ding</option>
          <option value="none">🔇 Silencioso</option>
        </select>
      </div>

      <button
        onClick={handleSalvar}
        disabled={salvando}
        className="mt-4 w-full flex items-center justify-center gap-2 border-0 rounded-[14px] py-3 px-6 text-sm font-bold cursor-pointer min-h-[50px] font-sans transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        style={{ background: 'var(--pending)', color: '#212529' }}
      >
        {salvando
          ? <><Spinner size={17} />Salvando...</>
          : <><Save size={17} strokeWidth={2.5} />Salvar Notificações</>}
      </button>
    </>
  );
}
