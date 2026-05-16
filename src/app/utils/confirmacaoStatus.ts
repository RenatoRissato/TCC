import type { StatusConfirmacao, TipoConfirmacao } from '../types/database';

/**
 * Status efetivo de UI para uma confirmação.
 *
 * O banco usa o eixo (status, tipo_confirmacao):
 *   - status='pendente'                            → sem resposta ainda
 *   - status='confirmado' + tipo='ida_e_volta'     → VAI
 *   - status='confirmado' + tipo='somente_ida'     → VAI
 *   - status='confirmado' + tipo='somente_volta'   → VAI
 *   - status='confirmado' + tipo='nao_vai'         → o responsável RESPONDEU
 *                                                    dizendo que NÃO VAI hoje
 *   - status='ausente'                             → sistema marcou ausente
 *                                                    (não respondeu até o limite)
 *
 * Em qualquer UI, "confirmado + nao_vai" e "ausente" são SEMANTICAMENTE iguais:
 * o aluno NÃO vai. Esse helper unifica os dois casos em 'nao_vai_hoje'.
 *
 * Use este helper em TODA tela que precise classificar o aluno como
 * vai/não vai/pendente — assim o app inteiro fica consistente.
 */
export type StatusUI = 'vai' | 'nao_vai_hoje' | 'pendente';

export function statusUIDaConfirmacao(
  status: StatusConfirmacao | null | undefined,
  tipo: TipoConfirmacao | null | undefined,
): StatusUI {
  if (status === 'pendente' || status == null) return 'pendente';
  if (status === 'ausente') return 'nao_vai_hoje';
  if (status === 'confirmado') {
    return tipo === 'nao_vai' ? 'nao_vai_hoje' : 'vai';
  }
  return 'pendente';
}

/**
 * Conveniência: dada uma confirmação, indica se o aluno embarca hoje.
 * Equivale a `statusUIDaConfirmacao(...) === 'vai'`.
 */
export function alunoVaiHoje(
  status: StatusConfirmacao | null | undefined,
  tipo: TipoConfirmacao | null | undefined,
): boolean {
  return statusUIDaConfirmacao(status, tipo) === 'vai';
}

/**
 * Status DETALHADO de UI — quebra "vai" nos 3 tipos da resposta do responsável
 * (ida e volta / somente ida / somente volta) e mantém "nao_vai" e "pendente"
 * separados. Use este helper quando a UI precisa mostrar granularidade total,
 * por ex. badges coloridas por tipo de viagem.
 *
 * Mapeamento:
 *   - status='pendente' ou null → 'pendente'
 *   - status='ausente'          → 'nao_vai' (sistema marcou — mesma semântica)
 *   - status='confirmado' + tipo='ida_e_volta'    → 'ida_e_volta'
 *   - status='confirmado' + tipo='somente_ida'    → 'somente_ida'
 *   - status='confirmado' + tipo='somente_volta'  → 'somente_volta'
 *   - status='confirmado' + tipo='nao_vai'        → 'nao_vai'
 *   - status='confirmado' sem tipo (legado)       → 'ida_e_volta' (fallback)
 */
export type StatusUIDetalhado =
  | 'ida_e_volta'
  | 'somente_ida'
  | 'somente_volta'
  | 'nao_vai'
  | 'pendente';

export function statusUIDetalhadoDaConfirmacao(
  status: StatusConfirmacao | null | undefined,
  tipo: TipoConfirmacao | null | undefined,
): StatusUIDetalhado {
  if (status === 'pendente' || status == null) return 'pendente';
  if (status === 'ausente') return 'nao_vai';
  if (status === 'confirmado') {
    if (tipo === 'nao_vai') return 'nao_vai';
    if (tipo === 'somente_ida') return 'somente_ida';
    if (tipo === 'somente_volta') return 'somente_volta';
    return 'ida_e_volta';
  }
  return 'pendente';
}
