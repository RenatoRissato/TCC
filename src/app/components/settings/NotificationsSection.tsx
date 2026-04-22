import { ComponentType } from 'react';
import { MessageCircle, Smartphone, Bell, Volume2 } from 'lucide-react';
import { Toggle } from '../shared/Toggle';

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

interface NotificationsSectionProps {
  notifWA: boolean;   setNotifWA: (v: boolean) => void;
  notifPush: boolean; setNotifPush: (v: boolean) => void;
  notifPending: boolean; setNotifPending: (v: boolean) => void;
  alertSound: string; setAlertSound: (v: string) => void;
}

export function NotificationsSection(p: NotificationsSectionProps) {
  return (
    <>
      <ToggleRow
        icon={MessageCircle} iconColor="#25D366"
        title="Respostas WhatsApp (Tempo real)"
        desc="Alertas imediatos quando responsáveis responderem"
        value={p.notifWA} onChange={p.setNotifWA}
      />
      <ToggleRow
        icon={Smartphone} iconColor="#2979FF"
        title="Push Notifications"
        desc="Notificações mesmo com app em segundo plano"
        value={p.notifPush} onChange={p.setNotifPush}
      />
      <ToggleRow
        icon={Bell} iconColor="#FD7E14"
        title="Lembrete de Pendentes"
        desc="Alerta 1h antes da rota para passageiros sem resposta"
        value={p.notifPending} onChange={p.setNotifPending}
        last
      />

      <div className="pt-3.5">
        <label className="flex items-center gap-1.5 text-xs font-bold text-ink-soft mb-2">
          <Volume2 size={14} className="text-ink-muted" strokeWidth={2} />
          Som de Alerta
        </label>
        <select
          value={p.alertSound}
          onChange={(e) => p.setAlertSound(e.target.value)}
          className="w-full box-border bg-field border-2 border-field-border rounded-xl px-3 py-2.5 text-sm font-medium text-ink outline-none font-sans cursor-pointer min-h-[46px]"
        >
          <option value="default">🔔 Padrão do Sistema</option>
          <option value="chime">🎵 Chime Suave</option>
          <option value="bell">🔔 Sino</option>
          <option value="ding">✨ Ding</option>
          <option value="none">🔇 Silencioso</option>
        </select>
      </div>
    </>
  );
}
