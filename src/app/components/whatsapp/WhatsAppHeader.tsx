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
      className="relative overflow-hidden"
      style={{
        // Mesmo gradient dark dos outros headers polidos do app. Cor tematica
        // (WhatsApp green #25D366) entra pelos halos e pelo icone, nao como
        // fundo solido — consistente com Help, Privacy, Cookies.
        background: 'linear-gradient(155deg, #0A0D12 0%, #161B22 55%, #1A1F26 100%)',
        padding: `22px ${paddingX}px`,
      }}
    >
      {/* Halos WhatsApp green — sutis, posicionados em diagonais opostas pra
          dar volume ao header sem competir com a pill de status. */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-24 w-[380px] h-[380px] pointer-events-none rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(37,211,102,0.16) 0%, transparent 65%)' }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-20 -left-20 w-[300px] h-[300px] pointer-events-none rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(37,211,102,0.07) 0%, transparent 65%)' }}
      />

      <div className="relative flex items-center gap-3">
        {!isLg && (
          <button
            onClick={onOpenDrawer}
            aria-label="Abrir menu de navegação"
            className="touch-scale sr-press w-11 h-11 rounded-[14px] shrink-0 bg-white/[0.06] border-[1.5px] border-white/10 hover:bg-white/[0.1] transition-colors flex items-center justify-center cursor-pointer"
          >
            <Menu size={20} color="rgba(255,255,255,0.85)" strokeWidth={2.2} />
          </button>
        )}

        {/* Icone WhatsApp — gradient 3-stops verde, glow externo + inset
            highlight (mesma assinatura visual dos outros headers do app). */}
        <div
          className="shrink-0 w-12 h-12 rounded-[15px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #4ADE80 0%, #25D366 50%, #128C7E 100%)',
            boxShadow: '0 6px 22px -6px rgba(37,211,102,0.6), inset 0 1px 0 rgba(255,255,255,0.35)',
          }}
        >
          <MessageCircle size={22} color="#fff" strokeWidth={2.2} fill="rgba(255,255,255,0.18)" />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-extrabold text-[#4ADE80] tracking-[0.14em] uppercase m-0 leading-none">
            Bot WhatsApp
          </p>
          <h1
            className="text-[22px] font-black text-white m-0 mt-1.5 leading-none tracking-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            Painel WhatsApp
          </h1>
        </div>

        {/* Pill de status — sr-pulse-ring no estado conectado (igual ao da
            strip de KPIs de Routes/Dashboard). Estado offline mostra icone
            WifiOff em vez de dot. */}
        <div
          className="ml-auto shrink-0 flex items-center gap-2 rounded-full px-3 py-1.5"
          style={{
            background: connected ? 'rgba(74,222,128,0.10)' : 'rgba(220,53,69,0.10)',
            border: `1px solid ${connected ? 'rgba(74,222,128,0.32)' : 'rgba(220,53,69,0.32)'}`,
          }}
        >
          {connected ? (
            <span className="relative inline-flex">
              <span aria-hidden="true" className="sr-pulse-ring absolute inset-0 rounded-full bg-[#4ADE80]/50" />
              <span className="relative inline-block w-2 h-2 rounded-full bg-[#4ADE80]" />
            </span>
          ) : (
            <WifiOff size={13} color="#DC3545" strokeWidth={2.5} />
          )}
          <span
            className="text-[11px] font-extrabold tracking-[0.06em] uppercase"
            style={{ color: connected ? '#4ADE80' : '#DC3545' }}
          >
            {connected ? 'Conectado' : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  );
}
