import { School, Home, ArrowRight, AlertCircle } from 'lucide-react';
import type { DirecaoViagem } from '../../types/database';
import { BottomSheetModal } from '../shared/BottomSheetModal';

interface DirecaoViagemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rotaNome?: string;
  /** Quando false, "Levar para casa" fica desabilitado com explicação. */
  temDestinoFinal: boolean;
  onEscolher: (direcao: DirecaoViagem) => void;
}

interface OpcaoProps {
  emoji: string;
  Icon: typeof School;
  titulo: string;
  descricao: string;
  cor: string;
  bgClasse: string;
  borderClasse: string;
  desabilitado?: boolean;
  motivoDesabilitado?: string;
  onClick: () => void;
}

function OpcaoBotao({
  emoji, Icon, titulo, descricao, cor, bgClasse, borderClasse,
  desabilitado, motivoDesabilitado, onClick,
}: OpcaoProps) {
  return (
    <button
      onClick={onClick}
      disabled={desabilitado}
      type="button"
      className={`group relative flex w-full items-stretch gap-3 rounded-[18px] border-2 ${borderClasse} ${bgClasse} p-4 text-left transition-transform touch-scale ${
        desabilitado ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'
      }`}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
        style={{ background: `${cor}22` }}
      >
        <span>{emoji}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Icon size={16} strokeWidth={2.5} style={{ color: cor }} />
          <p className="m-0 text-sm font-extrabold text-ink truncate">{titulo}</p>
        </div>
        <p className="m-0 text-[12px] leading-snug text-ink-soft">{descricao}</p>
        {desabilitado && motivoDesabilitado && (
          <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-danger/8 px-2 py-1.5">
            <AlertCircle size={12} className="mt-[1px] shrink-0 text-danger" strokeWidth={2.4} />
            <p className="m-0 text-[11px] font-semibold leading-tight text-danger">{motivoDesabilitado}</p>
          </div>
        )}
      </div>
      {!desabilitado && (
        <ArrowRight size={18} className="self-center shrink-0 text-ink-muted transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
      )}
    </button>
  );
}

export function DirecaoViagemModal({
  open, onOpenChange, rotaNome, temDestinoFinal, onEscolher,
}: DirecaoViagemModalProps) {
  return (
    <BottomSheetModal
      open={open}
      onOpenChange={onOpenChange}
      title="Direção da viagem"
      hideHandle
      forceCenter
      maxWidth={420}
    >
      <div className="p-5 font-sans">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-[16px] bg-pending/15 text-2xl">
            🚐
          </div>
          <p className="m-0 text-base font-extrabold text-ink">Qual é o trajeto agora?</p>
          {rotaNome && (
            <p className="m-0 mt-1 text-[12px] font-medium text-ink-soft">
              Rota: <span className="font-bold text-ink">{rotaNome}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <OpcaoBotao
            emoji="🏫"
            Icon={School}
            titulo="Buscar alunos"
            descricao="Sai do ponto de partida, passa pelos passageiros e termina na escola."
            cor="#198754"
            bgClasse="bg-success/[0.06] hover:bg-success/[0.10]"
            borderClasse="border-success/30"
            onClick={() => onEscolher('buscar')}
          />
          <OpcaoBotao
            emoji="🏠"
            Icon={Home}
            titulo="Levar para casa"
            descricao="Sai da escola, passa pelos passageiros em ordem inversa e volta para o ponto de partida."
            cor="#6C5CE7"
            bgClasse="bg-[#6C5CE7]/[0.06] hover:bg-[#6C5CE7]/[0.10]"
            borderClasse="border-[#6C5CE7]/30"
            desabilitado={!temDestinoFinal}
            motivoDesabilitado="Cadastre um destino final na rota para usar o retorno."
            onClick={() => onEscolher('retorno')}
          />
        </div>

        <button
          onClick={() => onOpenChange(false)}
          type="button"
          className="mt-4 w-full rounded-[13px] border-2 border-app-border bg-transparent py-3 text-sm font-bold text-ink-soft cursor-pointer min-h-12"
        >
          Cancelar
        </button>
      </div>
    </BottomSheetModal>
  );
}
