import { Play } from 'lucide-react';
import { useViagemAtiva } from '../context/ViagemAtivaContext';

interface FabPlayProps {
  /**
   * - 'absolute': para encaixar no slot central do BottomNav (posicionado
   *   relativo ao container do nav). Eleva 22px acima do nav.
   * - 'fixed':   para uso em desktop (canto inferior direito da viewport).
   */
  variante?: 'absolute' | 'fixed';
}

export function FabPlay({ variante = 'absolute' }: FabPlayProps) {
  const { abrirPlayFlow } = useViagemAtiva();

  // Posicionamento conforme variante. 'absolute' encosta no centro do nav;
  // 'fixed' fica preso na viewport.
  const posicao: React.CSSProperties = variante === 'fixed'
    ? {
        position: 'fixed',
        right: 28,
        bottom: 28,
        zIndex: 60,
      }
    : {
        position: 'absolute',
        left: '50%',
        top: 0,
        transform: 'translate(-50%, -22px)',
        zIndex: 5,
      };

  return (
    <button
      onClick={abrirPlayFlow}
      aria-label="Iniciar trajeto"
      style={{
        ...posicao,
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: '#FFC107',
        border: '4px solid #0A0D12',
        boxShadow: '0 10px 24px rgba(255,193,7,0.45), 0 2px 6px rgba(0,0,0,0.35)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.15s ease',
      }}
      onTouchStart={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        const base = variante === 'absolute' ? 'translate(-50%, -22px)' : '';
        el.style.transform = `${base} scale(0.92)`.trim();
      }}
      onTouchEnd={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = variante === 'absolute' ? 'translate(-50%, -22px)' : '';
      }}
    >
      <Play size={24} color="#212529" strokeWidth={3} fill="#212529" />
    </button>
  );
}
