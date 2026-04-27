import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import { AuthError, getMotorista } from '../_shared/auth.ts'

interface Body {
  viagem_id?: string
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    if (req.method !== 'POST') {
      return erroCliente('Método não permitido', 'METODO_INVALIDO', 400)
    }

    const { motorista, supabase } = await getMotorista(req)

    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return erroCliente('Body JSON inválido', 'BODY_INVALIDO', 400)
    }

    const viagemId = body.viagem_id?.trim()
    if (!viagemId) {
      return erroCliente('viagem_id é obrigatório', 'VIAGEM_OBRIGATORIA', 400)
    }

    // Verifica que a viagem pertence a uma rota do motorista
    const { data: viagem, error: viagemErr } = await supabase
      .from('viagens')
      .select('id, status, rotas!inner(motorista_id)')
      .eq('id', viagemId)
      .maybeSingle()

    if (viagemErr) throw viagemErr
    if (
      !viagem ||
      // deno-lint-ignore no-explicit-any
      (viagem as any).rotas?.motorista_id !== motorista.id
    ) {
      return erroCliente(
        'Viagem não encontrada ou não pertence ao motorista',
        'VIAGEM_NAO_ENCONTRADA',
        403,
      )
    }

    if (viagem.status === 'finalizada') {
      return erroCliente(
        'Viagem já foi finalizada',
        'VIAGEM_JA_FINALIZADA',
        409,
      )
    }

    // Marca pendentes como ausente
    const { data: ausentes, error: updPaxErr } = await supabase
      .from('confirmacoes')
      .update({ status: 'ausente' })
      .eq('viagem_id', viagemId)
      .eq('status', 'pendente')
      .select('id')
    if (updPaxErr) throw updPaxErr

    // Atualiza viagem
    const finalizadaEm = new Date().toISOString()
    const { error: updViagemErr } = await supabase
      .from('viagens')
      .update({ status: 'finalizada', finalizada_em: finalizadaEm })
      .eq('id', viagemId)
    if (updViagemErr) throw updViagemErr

    return ok({
      viagem_id: viagemId,
      finalizadaEm,
      ausentes_marcados: ausentes?.length ?? 0,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return erroCliente(err.message, err.codigo, err.status)
    }
    return erroServidor(err)
  }
})
