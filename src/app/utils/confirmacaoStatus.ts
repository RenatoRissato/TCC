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
