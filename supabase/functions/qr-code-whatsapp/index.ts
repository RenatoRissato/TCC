// deno-lint-ignore-file no-explicit-any
import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import {
  AuthError,
  criarClienteServico,
  getMotorista,
} from '../_shared/auth.ts'
import {
  evolutionConectarInstancia,
  evolutionFetchInstanceInfo,
  evolutionVerificarConexao,
} from '../_shared/evolution.ts'
import type { SupabaseClient } from '@supabase/supabase-js'

// Solicita um QR Code novo na Evolution API e marca a instância como
// 'aguardando_qr'. O QR retornado já vem em data-URL pronto para <img>.

const EXPIRA_EM_SEGUNDOS = 60
const TENTATIVAS_GERAR_QR = 6
const INTERVALO_TENTATIVA_MS = 2_000

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function textoErro(valor: unknown): string {
  if (valor instanceof Error) return valor.message
  if (typeof valor === 'string') return valor
  if (valor && typeof valor === 'object') {
    try {
      return JSON.stringify(valor)
    } catch {
      return String(valor)
    }
  }
  return String(valor)
}

function respostaEvolutionEstaAberta(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  const data = raw as {
    state?: unknown
    connectionStatus?: unknown
    instance?: { state?: unknown; connectionStatus?: unknown }
  }
  const candidatos = [
    data.state,
    data.connectionStatus,
    data.instance?.state,
    data.instance?.connectionStatus,
  ]
  return candidatos.some((valor) =>
    typeof valor === 'string' &&
    ['open', 'connected'].includes(valor.trim().toLowerCase()),
  )
}

async function salvarInstancia(
  servico: SupabaseClient,
  motoristaId: string,
  patch: Record<string, unknown>,
) {
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

async function retornarJaConectado(
  servico: SupabaseClient,
  motoristaId: string,
  patchExtra: Record<string, unknown> = {},
) {
  const instancia = await salvarInstancia(servico, motoristaId, {
    status_conexao: 'conectado',
    data_ultima_conexao: new Date().toISOString(),
    ...patchExtra,
  })

  return ok({
    instancia,
    conectado: true,
    ja_conectado: true,
    qr: null,
    pairing_code: null,
    expira_em_segundos: 0,
  })
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

    // Se a instancia ja esta conectada, a Evolution pode nao retornar QR.
    // Nesse caso, atualizamos o banco e devolvemos sucesso para a UI fechar
    // o fluxo de QR e mostrar "Conectado".
    try {
      const info = await evolutionFetchInstanceInfo()
      const conectado = info.state === 'open' || (!info.state && await evolutionVerificarConexao())
      if (conectado) {
        const patch: Record<string, unknown> = {}
        if (info.numero) patch.numero_conta = info.numero
        if (info.nome) patch.nome_conta_wa = info.nome
        return await retornarJaConectado(servico, motorista.id, patch)
      }
    } catch (e) {
      console.warn('Falha ao verificar conexao antes de gerar QR:', e)
    }

    let qr: string | null = null
    let pairingCode: string | null = null
    let erroEvolution: string | null = null
    let respostaEvolution: unknown = null

    for (let tentativa = 1; tentativa <= TENTATIVAS_GERAR_QR; tentativa++) {
      try {
        const r = await evolutionConectarInstancia()
        qr = r.qr
        pairingCode = r.pairingCode
        respostaEvolution = r.raw
        if (respostaEvolutionEstaAberta(r.raw)) {
          return await retornarJaConectado(servico, motorista.id)
        }
        if (qr || pairingCode) break
      } catch (e) {
        erroEvolution = textoErro(e)
      }

      try {
        const info = await evolutionFetchInstanceInfo()
        const conectado = info.state === 'open' || (!info.state && await evolutionVerificarConexao())
        if (conectado) {
          const patch: Record<string, unknown> = {}
          if (info.numero) patch.numero_conta = info.numero
          if (info.nome) patch.nome_conta_wa = info.nome
          return await retornarJaConectado(servico, motorista.id, patch)
        }
      } catch (e) {
        console.warn('Falha ao verificar status durante tentativa de QR:', e)
      }

      if (tentativa < TENTATIVAS_GERAR_QR) {
        await aguardar(INTERVALO_TENTATIVA_MS)
      }
    }

    if (!qr && !pairingCode) {
      return erroCliente(
        'Evolution API não retornou QR Code. Verifique se a instância existe e os secrets estão corretos.',
        'EVOLUTION_SEM_QR',
        503,
        {
          detalhes: erroEvolution ??
            `Resposta da Evolution sem QR: ${JSON.stringify(respostaEvolution)}`,
          evolution_resposta: respostaEvolution,
        },
      )
    }

    let instancia = null
    let avisoBanco: string | null = null
    try {
      instancia = await salvarInstancia(servico, motorista.id, {
        status_conexao: 'aguardando_qr',
      })
    } catch (e) {
      avisoBanco = textoErro(e)
      console.error('QR gerado, mas falhou ao salvar instancias_whatsapp:', e)
    }
    if (!instancia && !qr) {
      return erroCliente(
        'Instância WhatsApp não encontrada para o motorista',
        'INSTANCIA_NAO_ENCONTRADA',
        404,
      )
    }

    return ok({
      instancia,
      qr,
      pairing_code: pairingCode,
      expira_em_segundos: EXPIRA_EM_SEGUNDOS,
      aviso_banco: avisoBanco,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return erroCliente(err.message, err.codigo, err.status)
    }
    return erroServidor(err)
  }
})
