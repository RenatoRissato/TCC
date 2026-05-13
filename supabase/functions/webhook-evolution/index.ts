// deno-lint-ignore-file no-explicit-any
import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import { criarClienteServico } from '../_shared/auth.ts'
import { evolutionEnviarTexto } from '../_shared/evolution.ts'
import { processarMensagemConfirmacao } from '../_shared/conversaConfirmacao.ts'
import { registrarMensagemConversa } from '../_shared/conversaRepository.ts'
import type { SupabaseClient } from '@supabase/supabase-js'

async function buscarIdsInstanciasParaEvento(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('instancias_whatsapp')
    .select('id, status_conexao')

  if (error) throw error
  const instancias = data ?? []

  if (instancias.length === 1) return [instancias[0].id]

  // Com EVOLUTION_INSTANCE_NAME global, eventos de conexao nao trazem o
  // motorista. Em contas multi-motorista, atualizamos apenas quem esta no
  // fluxo ativo de conexao para evitar marcar todos como conectados.
  return instancias
    .filter((i: any) =>
      i.status_conexao === 'aguardando_qr' ||
      i.status_conexao === 'conectando'
    )
    .map((i: any) => i.id)
}

async function atualizarInstanciasDoEvento(
  supabase: SupabaseClient,
  patch: Record<string, unknown>,
): Promise<number> {
  if (Object.keys(patch).length === 0) return 0

  const ids = await buscarIdsInstanciasParaEvento(supabase)
  if (ids.length === 0) return 0

  const { data, error } = await supabase
    .from('instancias_whatsapp')
    .update(patch)
    .in('id', ids)
    .select('id')

  if (error) throw error
  return data?.length ?? 0
}

function extrairTextoMensagem(data: any): {
  texto: string | null
  confirmacaoId: string | null
} {
  const listResp = data?.message?.listResponseMessage
  if (listResp) {
    const selectedRowId: string | undefined =
      listResp?.singleSelectReply?.selectedRowId

    if (selectedRowId) {
      const idx = selectedRowId.indexOf('_')
      if (idx > 0) {
        return {
          texto: selectedRowId.slice(0, idx),
          confirmacaoId: selectedRowId.slice(idx + 1),
        }
      }
      return { texto: selectedRowId, confirmacaoId: null }
    }
  }

  const texto =
    data?.message?.conversation ??
    data?.message?.extendedTextMessage?.text ??
    data?.message?.imageMessage?.caption ??
    null

  return {
    texto: typeof texto === 'string' ? texto : null,
    confirmacaoId: null,
  }
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    if (req.method !== 'POST') {
      return erroCliente('Metodo nao permitido', 'METODO_INVALIDO', 400)
    }

    const expected = Deno.env.get('WEBHOOK_SECRET') ?? ''
    const received = req.headers.get('x-webhook-secret') ?? ''
    if (!expected || expected !== received) {
      return erroCliente('Webhook secret invalido', 'WEBHOOK_INVALIDO', 401)
    }

    let payload: any
    try {
      payload = await req.json()
    } catch {
      return erroCliente('Payload invalido', 'BODY_INVALIDO', 400)
    }

    const evento: string | undefined = payload?.event

    if (evento === 'qrcode.updated') {
      const supabase = criarClienteServico()
      try {
        const atualizadas = await atualizarInstanciasDoEvento(
          supabase,
          { status_conexao: 'aguardando_qr' },
        )
        return ok({ tratado: 'qrcode.updated', instancias_atualizadas: atualizadas })
      } catch (e) {
        console.error('webhook qrcode.updated falhou:', e)
      }
      return ok({ tratado: 'qrcode.updated', instancias_atualizadas: 0 })
    }

    if (evento === 'connection.update') {
      const state: string | undefined =
        payload?.data?.state ?? payload?.data?.status
      const owner: string | undefined =
        payload?.data?.wuid ?? payload?.data?.owner ?? payload?.data?.ownerJid
      const profileName: string | undefined =
        payload?.data?.profileName ?? payload?.data?.profile_name
      const numero = owner ? owner.split('@')[0] : null

      const supabase = criarClienteServico()
      const patch: Record<string, unknown> = {}
      if (state === 'open') {
        patch.status_conexao = 'conectado'
        patch.data_ultima_conexao = new Date().toISOString()
        if (numero) patch.numero_conta = numero
        if (profileName) patch.nome_conta_wa = profileName
      } else if (state === 'close' || state === 'refused') {
        patch.status_conexao = 'desconectado'
      } else if (state === 'connecting') {
        patch.status_conexao = 'conectando'
      }

      if (Object.keys(patch).length > 0) {
        try {
          const atualizadas = await atualizarInstanciasDoEvento(supabase, patch)
          return ok({
            tratado: 'connection.update',
            state,
            instancias_atualizadas: atualizadas,
          })
        } catch (e) {
          console.error('webhook connection.update falhou:', e)
        }
      }
      return ok({ tratado: 'connection.update', state, instancias_atualizadas: 0 })
    }

    if (evento !== 'messages.upsert') {
      return ok({ ignorado: true, motivo: `evento ${evento ?? 'desconhecido'}` })
    }

    const data = payload?.data

    // Ignora mensagens enviadas pelo proprio bot. Sem isso, respostas
    // automaticas de saida voltariam no webhook e seriam processadas de novo.
    if (data?.key?.fromMe === true) {
      return ok({ ignorado: true, motivo: 'mensagem enviada pelo proprio bot' })
    }

    const { texto, confirmacaoId } = extrairTextoMensagem(data)
    if (!texto) {
      return ok({ ignorado: true, motivo: 'mensagem sem texto processavel' })
    }

    const remoteJid: string | undefined = data?.key?.remoteJid
    const telefoneRemetente = remoteJid
      ? remoteJid.split('@')[0].replace(/\D/g, '')
      : ''

    if (!telefoneRemetente) {
      return ok({ ignorado: true, motivo: 'sem telefone de remetente identificavel' })
    }

    const supabase = criarClienteServico()
    const resultado = await processarMensagemConfirmacao(supabase, {
      telefoneRemetente,
      texto,
      whatsappMessageId: data?.key?.id ?? null,
      confirmacaoId,
    })

    if (resultado.ignorado) {
      return ok({ ignorado: true, motivo: resultado.motivo })
    }

    if (resultado.telefoneDestino && resultado.mensagemResposta) {
      try {
        const resp = await evolutionEnviarTexto(
          resultado.telefoneDestino,
          resultado.mensagemResposta,
        )
        if (resultado.contextoLog) {
          await registrarMensagemConversa(supabase, {
            ...resultado.contextoLog,
            conteudo: resultado.mensagemResposta,
            direcao: 'saida',
            tipo: resultado.tipoMensagemResposta ?? 'resposta_confirmacao',
            statusEnvio: 'enviada',
            whatsappMessageId: resp.key?.id ?? null,
          })
        }
      } catch (e) {
        if (resultado.contextoLog) {
          await registrarMensagemConversa(supabase, {
            ...resultado.contextoLog,
            conteudo: resultado.mensagemResposta,
            direcao: 'saida',
            tipo: resultado.tipoMensagemResposta ?? 'resposta_confirmacao',
            statusEnvio: 'falha',
          })
        }
        console.error('Falha ao enviar resposta automatica da conversa', e)
      }
    }

    return ok({
      sucesso: true,
      estado: resultado.estado,
      tipo: resultado.tipoConfirmacao,
    })
  } catch (err) {
    return erroServidor(err)
  }
})
