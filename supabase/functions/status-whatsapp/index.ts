// deno-lint-ignore-file no-explicit-any
import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import {
  AuthError,
  criarClienteServico,
  getMotorista,
} from '../_shared/auth.ts'
import {
  EvolutionEstadoInstancia,
  evolutionFetchInstanceInfo,
  evolutionVerificarConexao,
} from '../_shared/evolution.ts'
import type { SupabaseClient } from '@supabase/supabase-js'

// Polling endpoint do fluxo de QR Code. Consulta a Evolution e atualiza
// instancias_whatsapp em tempo real.

type StatusConexao = 'conectado' | 'desconectado' | 'conectando' | 'aguardando_qr'

function mapearStatus(
  state: string | null,
  conectado: boolean,
  statusAtual: StatusConexao | null,
): StatusConexao {
  if (conectado) return 'conectado'
  if (state === 'open') return 'conectado'
  if (state === 'connecting') return 'conectando'
  if (state === null && statusAtual === 'aguardando_qr') return 'aguardando_qr'
  if (state === 'close' || state === 'refused' || state === null) {
    return 'desconectado'
  }
  return 'desconectado'
}

async function atualizarInstancia(
  servico: SupabaseClient,
  motoristaId: string,
  status: StatusConexao,
  info: EvolutionEstadoInstancia,
) {
  const patch: Record<string, unknown> = { status_conexao: status }
  if (status === 'conectado') {
    patch.data_ultima_conexao = new Date().toISOString()
    if (info.numero) patch.numero_conta = info.numero
    if (info.nome) patch.nome_conta_wa = info.nome
  }

  const { data, error } = await servico
    .from('instancias_whatsapp')
    .upsert(
      {
        motorista_id: motoristaId,
        ...patch,
      },
      { onConflict: 'motorista_id' },
    )
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return erroCliente('Método não permitido', 'METODO_INVALIDO', 400)
    }

    const { motorista } = await getMotorista(req)

    const servico = criarClienteServico()
    const { data: atual, error: atualErr } = await servico
      .from('instancias_whatsapp')
      .select('status_conexao')
      .eq('motorista_id', motorista.id)
      .maybeSingle()
    if (atualErr) throw atualErr

    let info: EvolutionEstadoInstancia = {
      state: null,
      numero: null,
      nome: null,
      raw: null,
    }
    let conectado = false
    let evolutionDisponivel = true
    let erroEvolution: string | null = null

    try {
      info = await evolutionFetchInstanceInfo()
      // Sanity-check: alguns deploys não preenchem state em fetchInstances.
      // Reforça com /connectionState quando state vier nulo.
      if (!info.state) {
        conectado = await evolutionVerificarConexao()
      } else {
        conectado = info.state === 'open'
      }
    } catch (e) {
      evolutionDisponivel = false
      erroEvolution = e instanceof Error ? e.message : String(e)
    }

    const status = mapearStatus(
      info.state,
      conectado,
      (atual?.status_conexao as StatusConexao | null) ?? null,
    )
    const instancia = await atualizarInstancia(
      servico,
      motorista.id,
      status,
      info,
    )

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
      status,
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
