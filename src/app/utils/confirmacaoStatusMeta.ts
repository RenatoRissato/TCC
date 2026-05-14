import {
  CheckCircle2, ArrowRight, ArrowLeft, XCircle, Clock,
  type LucideIcon,
} from 'lucide-react';
import type { StatusUIDetalhado } from './confirmacaoStatus';

export interface StatusUIDetalhadoMeta {
  label: string;
  /** Label curtinho para contadores compactos (ex: "Ida+Volta"). */
  labelCompacto: string;
  color: string;
  /** Cor de fundo aplicada como pill/chip translúcido. */
  bg: string;
  emoji: string;
  Icon: LucideIcon;
}

export const STATUS_UI_DETALHADO_META: Record<StatusUIDetalhado, StatusUIDetalhadoMeta> = {
  ida_e_volta: {
    label: 'Ida e volta',
    labelCompacto: 'Ida+Volta',
    color: '#198754',
    bg: 'rgba(25,135,84,0.12)',
    emoji: '✅',
    Icon: CheckCircle2,
  },
  somente_ida: {
    label: 'Somente ida',
    labelCompacto: 'Só ida',
    color: '#2979FF',
    bg: 'rgba(41,121,255,0.12)',
    emoji: '🔵',
    Icon: ArrowRight,
  },
  somente_volta: {
    label: 'Somente volta',
    labelCompacto: 'Só volta',
    color: '#6C5CE7',
    bg: 'rgba(108,92,231,0.12)',
    emoji: '🟣',
    Icon: ArrowLeft,
  },
  nao_vai: {
    label: 'Não vai hoje',
    labelCompacto: 'Não vai',
    color: '#DC3545',
    bg: 'rgba(220,53,69,0.12)',
    emoji: '❌',
    Icon: XCircle,
  },
  pendente: {
    label: 'Pendente',
    labelCompacto: 'Pendente',
    color: '#FD7E14',
    bg: 'rgba(253,126,20,0.12)',
    emoji: '⏳',
    Icon: Clock,
  },
};

/**
 * Ordem canônica para exibir os 5 status em listas/contadores. Indo primeiro
 * (do mais inclusivo ao mais restrito), depois "não vai", e por último
 * "pendente" — a leitura fica natural: confirmados → recusados → aguardando.
 */
export const STATUS_UI_DETALHADO_ORDEM: StatusUIDetalhado[] = [
  'ida_e_volta',
  'somente_ida',
  'somente_volta',
  'nao_vai',
  'pendente',
];
