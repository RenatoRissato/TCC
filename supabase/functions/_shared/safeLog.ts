// Logs seguros por padrao: dados de alunos/responsaveis so aparecem quando
// DEBUG_LOGS=true estiver configurado explicitamente no ambiente.
const DEBUG_LOGS = Deno.env.get('DEBUG_LOGS') === 'true'

export function mascararTelefone(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const digitos = valor.replace(/\D/g, '')
  if (digitos.length <= 4) return digitos ? '****' : null
  return `${'*'.repeat(Math.max(0, digitos.length - 4))}${digitos.slice(-4)}`
}

export function logDebug(mensagem: string, detalhes?: unknown): void {
  if (!DEBUG_LOGS) return
  if (detalhes === undefined) {
    console.log(mensagem)
    return
  }
  console.log(mensagem, JSON.stringify(detalhes))
}

export function logErro(mensagem: string, erro?: unknown, detalhes?: unknown): void {
  if (!DEBUG_LOGS) {
    console.error(mensagem)
    return
  }
  console.error(
    mensagem,
    JSON.stringify({
      detalhes: detalhes ?? null,
      erro: erro instanceof Error ? erro.message : erro ? String(erro) : null,
    }),
  )
}
