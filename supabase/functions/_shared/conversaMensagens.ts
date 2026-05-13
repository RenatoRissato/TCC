import type { TipoConfirmacao } from './conversaValidacao.ts'

const OPCOES_CONFIRMAR = [
  '1 - Ida e volta',
  '2 - Somente ida',
  '3 - Somente volta',
  '4 - Não vai hoje',
]

const OPCOES_DECISAO = [
  '1 - Sim, quero alterar',
  '2 - Não, manter resposta anterior',
]

export function montarMensagemOpcoesInvalidas(): string {
  return [
    'Não consegui entender sua resposta.',
    'Responda apenas com uma das opções válidas:',
    ...OPCOES_CONFIRMAR,
  ].join('\n')
}

export function montarMensagemJaConfirmou(nome: string): string {
  return [
    `Você já confirmou a resposta de ${nome} hoje.`,
    'Para alterar, envie uma nova opção de 1 a 4 e eu confirmo com você antes de salvar.',
  ].join('\n')
}

export function montarPerguntaAlteracao(nome: string): string {
  return [
    `${nome} já possui uma confirmação registrada hoje.`,
    'Deseja alterar a resposta anterior?',
    ...OPCOES_DECISAO,
  ].join('\n')
}

export function montarMensagemDecisaoInvalida(): string {
  return [
    'Responda apenas com uma das opções abaixo:',
    ...OPCOES_DECISAO,
  ].join('\n')
}

export function montarMensagemNovaEscolha(): string {
  return [
    'Certo. Envie a nova opção:',
    ...OPCOES_CONFIRMAR,
  ].join('\n')
}

export function montarMensagemManterAnterior(nome: string): string {
  return `Tudo certo. Mantive a resposta anterior de ${nome}.`
}

export function montarRespostaConfirmacao(
  tipo: TipoConfirmacao,
  nome: string,
): string {
  if (tipo === 'nao_vai') {
    return `Entendido! ${nome} não vai hoje. Obrigado por avisar.`
  }
  return `Confirmado! ${nome} estará aguardando a van. Bom dia!`
}

export function montarRespostaAlteracao(
  tipo: TipoConfirmacao,
  nome: string,
): string {
  if (tipo === 'nao_vai') {
    return `Resposta alterada! ${nome} não vai hoje. Obrigado por avisar.`
  }
  return `Resposta alterada! ${nome} estará aguardando a van.`
}

export function montarMensagemSemConfirmacaoHoje(): string {
  return 'Não encontrei uma confirmação ativa para hoje. Quando a mensagem da rota chegar, responda com uma opção de 1 a 4.'
}
