// deno-lint-ignore-file no-explicit-any
import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import { AuthError, getMotorista } from '../_shared/auth.ts'
import { processarIniciarViagem } from '../_shared/viagem.ts'

interface Body {
  rota_id?: string
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

    const rotaId = body.rota_id?.trim()
    if (!rotaId) {
      return erroCliente('rota_id é obrigatório', 'ROTA_OBRIGATORIA', 400)
    }

    try {
      const resumo = await processarIniciarViagem(supabase, motorista.id, rotaId)
      return ok(resumo, resumo.ja_existia ? 200 : 201)
    } catch (err: any) {
      if (err?.codigo === 'ROTA_NAO_ENCONTRADA') {
        return erroCliente(err.message, 'ROTA_NAO_ENCONTRADA', 403)
      }
      if (err?.codigo === 'PASSAGEIRO_NAO_ENCONTRADO') {
        return erroCliente(err.message, 'PASSAGEIRO_NAO_ENCONTRADO', 404)
      }
      throw err
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return erroCliente(err.message, err.codigo, err.status)
    }
    return erroServidor(err)
  }
})
