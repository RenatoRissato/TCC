// deno-lint-ignore-file no-explicit-any
import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import {
  AuthError,
  criarClienteServico,
  getMotorista,
} from '../_shared/auth.ts'
import { evolutionDesconectarInstancia } from '../_shared/evolution.ts'

// Desconecta a sessão WhatsApp do motorista.
//
// Estratégia: a Evolution às vezes recusa o logout (instância já desconectada,
// network blip, instância recriada externamente). Em qualquer um desses casos,
// o estado desejado pelo motorista — "minha conta está desconectada no app" —
// continua sendo possível. Por isso, mesmo se a Evolution recusar, atualizamos
// o banco para 'desconectado' e retornamos sucesso COM aviso. O usuário fica
// livre para reconectar sem ficar preso num estado "Conectado" inconsistente.

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    if (req.method !== 'POST' && req.method !== 'DELETE') {
      return erroCliente('Metodo nao permitido', 'METODO_INVALIDO', 400)
    }

    const { motorista } = await getMotorista(req)

    let evolutionResposta: unknown = null
    let evolutionAviso: string | null = null
    try {
      evolutionResposta = await evolutionDesconectarInstancia()
    } catch (e) {
      evolutionAviso = e instanceof Error ? e.message : String(e)
      console.warn(
        '[desconectar-whatsapp] Evolution recusou logout, mantendo desconexão local',
        JSON.stringify({ motorista_id: motorista.id, erro: evolutionAviso }),
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
      evolution_aviso: evolutionAviso,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return erroCliente(err.message, err.codigo, err.status)
    }
    return erroServidor(err)
  }
})
