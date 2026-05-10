// deno-lint-ignore-file no-explicit-any
import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import {
  AuthError,
  criarClienteServico,
  getMotorista,
} from '../_shared/auth.ts'
import { evolutionDesconectarInstancia } from '../_shared/evolution.ts'

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    if (req.method !== 'POST' && req.method !== 'DELETE') {
      return erroCliente('Metodo nao permitido', 'METODO_INVALIDO', 400)
    }

    const { motorista } = await getMotorista(req)

    let evolutionResposta: unknown = null
    try {
      evolutionResposta = await evolutionDesconectarInstancia()
    } catch (e) {
      return erroCliente(
        'Falha ao desconectar a instancia na Evolution API',
        'EVOLUTION_LOGOUT_FALHOU',
        503,
        { detalhes: e instanceof Error ? e.message : String(e) },
      )
    }

    const servico = criarClienteServico()
    const { data: instancia, error } = await servico
      .from('instancias_whatsapp')
      .upsert(
        {
          motorista_id: motorista.id,
          status_conexao: 'desconectado',
          numero_conta: null,
          nome_conta_wa: null,
        },
        { onConflict: 'motorista_id' },
      )
      .select('*')
      .maybeSingle()

    if (error) throw error

    return ok({
      sucesso: true,
      instancia,
      evolution_resposta: evolutionResposta,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return erroCliente(err.message, err.codigo, err.status)
    }
    return erroServidor(err)
  }
})
