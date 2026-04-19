import { Menu, MessageCircle, WifiOff } from 'lucide-react';

interface WhatsAppHeaderProps {
  connected: boolean;
  isLg: boolean;
  paddingX: number;
  onOpenDrawer: () => void;
}

export function WhatsAppHeader({ connected, isLg, paddingX, onOpenDrawer }: WhatsAppHeaderProps) {
  return (
    <div
      className="bg-[linear-gradient(160deg,#075E54,#128C7E)]"
      style={{ padding: `20px ${paddingX}px` }}
    >
      <div className="flex items-center gap-3">
        {!isLg && (
          <button
            onClick={onOpenDrawer}
            aria-label="Abrir menu de navegação"
            className="touch-scale w-[42px] h-[42px] rounded-[13px] shrink-0 bg-[rgba(255,255,255,0.15)] border-[1.5px] border-[rgba(255,255,255,0.2)] flex items-center justify-center cursor-pointer"
          >
            <Menu size={20} color="#fff" strokeWidth={2} />
          </button>
        )}
        <div className="w-[42px] h-[42px] bg-[rgba(255,255,255,0.15)] rounded-[14px] flex items-center justify-center">
          <MessageCircle size={22} color="#fff" strokeWidth={2} fill="rgba(255,255,255,0.2)" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-white m-0 leading-tight">Painel WhatsApp</h1>
          <p className="text-[11px] text-[rgba(255,255,255,0.6)] m-0">Bot automático de confirmações</p>
        </div>
        <div
          className="ml-auto flex items-center gap-[5px] rounded-[20px] px-2.5 py-[5px]"
          style={{ background: connected ? 'rgba(37,211,102,.2)' : 'rgba(220,53,69,.2)' }}
        >
          {connected
            ? <span className="pulse-dot w-[7px] h-[7px] rounded-full bg-whatsapp inline-block" />
            : <WifiOff size={13} color="#DC3545" />}
          <span
            className="text-[11px] font-bold"
            style={{ color: connected ? '#25D366' : '#DC3545' }}
          >
            {connected ? 'Conectado' : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  );
}
