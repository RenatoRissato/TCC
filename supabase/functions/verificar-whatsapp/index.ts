// deno-lint-ignore-file no-explicit-any
import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import {
  AuthError,
  criarClienteServico,
  getMotorista,
} from '../_shared/auth.ts'
import { evolutionVerificarConexao } from '../_shared/evolution.ts'

// Consulta o estado real da conexão na Evolution API e atualiza
// instancias_whatsapp.status_conexao para refletir a realidade.
// Frontend chama isso ao abrir a tela WhatsApp e ao apertar "Atualizar".

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return erroCliente('Método não permitido', 'METODO_INVALIDO', 400)
    }

    const { motorista } = await getMotorista(req)

    let conectado = false
    let evolutionDisponivel = true
    let erroEvolution: string | null = null
    try {
      conectado = await evolutionVerificarConexao()
    } catch (e) {
      evolutionDisponivel = false
      erroEvolution = e instanceof Error ? e.message : String(e)
    }

    // Service role para garantir UPDATE mesmo quando o RLS for restritivo
    // (instancias_whatsapp tem policy `for all` mas usamos service para
    // alinhar com criar-perfil-motorista e webhook-evolution).
    const servico = criarClienteServico()

    const novoStatus = conectado ? 'conectado' : 'desconectado'
    const patch: Record<string, unknown> = { status_conexao: novoStatus }
    if (conectado) {
      patch.data_ultima_conexao = new Date().toISOString()
    }

    const { data: instancia, error: updErr } = await servico
      .from('instancias_whatsapp')
      .update(patch)
      .eq('motorista_id', motorista.id)
      .select('*')
      .maybeSingle()

    if (updErr) throw updErr
    if (!instancia) {
      return erroCliente(
        'Instância WhatsApp não encontrada para o motorista',
        'INSTANCIA_NAO_ENCONTRADA',
        404,
      )
    }

    return ok({
      instancia,
      conectado,
      evolution_disponivel: evolutionDisponivel,
      erro_evolution: erroEvolution,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return erroCliente(err.message, err.codigo, err.status)
    }
    return erroServidor(err)
  }
})
