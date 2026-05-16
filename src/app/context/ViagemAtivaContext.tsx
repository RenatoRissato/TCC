import {
  createContext, useContext, useMemo, useState,
} from 'react';

/**
 * Controla o estado do PlayFlowSheet (modal de 3 etapas iniciado pelo FAB).
 *
 * Vive no nível do AppLayout para que o FAB (BottomNav no mobile, fixed no
 * desktop) e o sheet (renderizado uma única vez no AppLayout) compartilhem
 * o mesmo estado de aberto/fechado.
 *
 * Nota histórica: este context já incluiu detecção de "viagem em andamento"
 * para o FAB ficar verde e abrir um modal alternativo. A regra foi removida
 * a pedido do motorista — agora o FAB SEMPRE abre o flow de 3 etapas,
 * independente de já existir viagem do dia.
 */
interface PlayFlowContextValue {
  playFlowAberto: boolean;
  abrirPlayFlow: () => void;
  fecharPlayFlow: () => void;
}

const PlayFlowContext = createContext<PlayFlowContextValue | null>(null);

export function ViagemAtivaProvider({ children }: { children: React.ReactNode }) {
  const [playFlowAberto, setPlayFlowAberto] = useState(false);

  const value = useMemo<PlayFlowContextValue>(() => ({
    playFlowAberto,
    abrirPlayFlow: () => setPlayFlowAberto(true),
    fecharPlayFlow: () => setPlayFlowAberto(false),
  }), [playFlowAberto]);

  return (
    <PlayFlowContext.Provider value={value}>
      {children}
    </PlayFlowContext.Provider>
  );
}

export function useViagemAtiva(): PlayFlowContextValue {
  const ctx = useContext(PlayFlowContext);
  if (!ctx) {
    throw new Error('useViagemAtiva deve ser usado dentro de ViagemAtivaProvider');
  }
  return ctx;
}
