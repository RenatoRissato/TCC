// deno-lint-ignore-file no-explicit-any
import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import { AuthError, getMotorista } from '../_shared/auth.ts'
import {
  EVENTOS_WEBHOOK_PADRAO,
  evolutionConfigurarWebhook,
} from '../_shared/evolution.ts'

// One-shot: registra (ou re-registra) o webhook na Evolution API com os
// eventos atuais que o sistema processa: MESSAGES_UPSERT, MESSAGES_UPDATE,
// QRCODE_UPDATED, CONNECTION_UPDATE. Pode ser chamada novamente sempre que a lista de
// eventos mudar.

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    if (req.method !== 'POST') {
      return erroCliente('Método não permitido', 'METODO_INVALIDO', 400)
    }

    // Exige JWT — só motorista logado pode acionar.
    await getMotorista(req)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET') ?? ''
    if (!supabaseUrl || !webhookSecret) {
      return erroCliente(
        'SUPABASE_URL ou WEBHOOK_SECRET ausentes nos secrets',
        'SECRETS_AUSENTES',
        503,
      )
    }

    let body: { eventos?: string[] } = {}
    try {
      body = (await req.json()) as { eventos?: string[] }
    } catch {
      // body é opcional
    }

    const eventos =
      Array.isArray(body.eventos) && body.eventos.length > 0
        ? body.eventos
        : EVENTOS_WEBHOOK_PADRAO

    const webhookUrl = `${supabaseUrl}/functions/v1/webhook-evolution`

    let resposta: any
    try {
      resposta = await evolutionConfigurarWebhook(
        webhookUrl,
        webhookSecret,
        eventos,
      )
    } catch (e) {
      return erroCliente(
        'Falha ao registrar webhook na Evolution API',
        'EVOLUTION_REGISTRO_FALHOU',
        503,
        { detalhes: e instanceof Error ? e.message : String(e) },
      )
    }

    return ok({
      sucesso: true,
      url: webhookUrl,
      eventos,
      evolution_resposta: resposta,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return erroCliente(err.message, err.codigo, err.status)
    }
    return erroServidor(err)
  }
})
