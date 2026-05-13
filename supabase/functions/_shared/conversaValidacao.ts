export type TipoConfirmacao =
  | 'ida_e_volta'
  | 'somente_ida'
  | 'somente_volta'
  | 'nao_vai'

export type EstadoConversaConfirmacao =
  | 'sem_resposta'
  | 'confirmado'
  | 'aguardando_decisao'
  | 'aguardando_nova_resposta'

export const NUMERO_PARA_TIPO: Record<string, TipoConfirmacao> = {
  '1': 'ida_e_volta',
  '2': 'somente_ida',
  '3': 'somente_volta',
  '4': 'nao_vai',
}

export function extrairNumeroResposta(texto: string | null | undefined): string | null {
  if (!texto || typeof texto !== 'string') return null
  const limpo = texto.trim()
  if (!limpo) return null
  const match = limpo.match(/^(\d+)\b/)
  return match ? match[1] : null
}

export function validarOpcaoConfirmacao(texto: string | null | undefined): {
  valido: boolean
  numero: string | null
  tipo: TipoConfirmacao | null
} {
  const numero = extrairNumeroResposta(texto)
  if (!numero) return { valido: false, numero: null, tipo: null }
  const tipo = NUMERO_PARA_TIPO[numero] ?? null
  return { valido: !!tipo, numero, tipo }
}

export function validarOpcaoDecisao(texto: string | null | undefined): {
  valido: boolean
  numero: '1' | '2' | null
} {
  const numero = extrairNumeroResposta(texto)
  if (numero === '1' || numero === '2') {
    return { valido: true, numero }
  }
  return { valido: false, numero: null }
}
