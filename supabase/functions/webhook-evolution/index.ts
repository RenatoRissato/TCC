// deno-lint-ignore-file no-explicit-any
import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import { criarClienteServico } from '../_shared/auth.ts'
import { evolutionEnviarTexto } from '../_shared/evolution.ts'
import type { SupabaseClient } from '@supabase/supabase-js'

type TipoConfirmacao =
  | 'ida_e_volta'
  | 'somente_ida'
  | 'somente_volta'
  | 'nao_vai'

const NUMERO_PARA_TIPO: Record<string, TipoConfirmacao> = {
  '1': 'ida_e_volta',
  '2': 'somente_ida',
  '3': 'somente_volta',
  '4': 'nao_vai',
}

function montarRespostaConfirmacao(
  tipo: TipoConfirmacao,
  nome: string,
): string {
  if (tipo === 'nao_vai') {
    return `Entendido! ${nome} não vai hoje. Obrigado por avisar.`
  }
  return `Confirmado! ${nome} estará aguardando a van. Bom dia!`
}

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

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    if (req.method !== 'POST') {
      return erroCliente('Método não permitido', 'METODO_INVALIDO', 400)
    }

    const expected = Deno.env.get('WEBHOOK_SECRET') ?? ''
    const received = req.headers.get('x-webhook-secret') ?? ''
    if (!expected || expected !== received) {
      return erroCliente('Webhook secret inválido', 'WEBHOOK_INVALIDO', 401)
    }

    let payload: any
    try {
      payload = await req.json()
    } catch {
      return erroCliente('Payload inválido', 'BODY_INVALIDO', 400)
    }

    const evento: string | undefined = payload?.event

    // ---- Eventos de conexão / QR ----
    // Só temos uma instância Evolution global (EVOLUTION_INSTANCE_NAME) hoje,
    // então qualquer evento dessa instância vale para todos os motoristas.
    // Se a arquitetura virar multi-tenant, basta filtrar pelo `payload.instance`.
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
    const listResp = data?.message?.listResponseMessage
    if (!listResp) {
      return ok({ ignorado: true, motivo: 'mensagem não é resposta de lista' })
    }

    const selectedRowId: string | undefined =
      listResp?.singleSelectReply?.selectedRowId
    if (!selectedRowId) {
      return ok({ ignorado: true, motivo: 'sem selectedRowId' })
    }

    const idx = selectedRowId.indexOf('_')
    if (idx <= 0) {
      return erroCliente(
        'Formato de rowId inválido',
        'ROW_ID_INVALIDO',
        400,
      )
    }
    const numero = selectedRowId.slice(0, idx)
    const confirmacaoId = selectedRowId.slice(idx + 1)

    const tipoConfirmacao = NUMERO_PARA_TIPO[numero]
    if (!tipoConfirmacao) {
      return erroCliente(
        `Número ${numero} não mapeado para tipo de confirmação`,
        'NUMERO_INVALIDO',
        400,
      )
    }

    const supabase = criarClienteServico()

    // Busca confirmação + dados do passageiro
    const { data: confirmacao, error: confErr } = await supabase
      .from('confirmacoes')
      .select(
        'id, status, viagem_id, passageiro_id, passageiros(id, nome_completo, telefone_responsavel, rota_id, rotas(motorista_id))',
      )
      .eq('id', confirmacaoId)
      .maybeSingle()

    if (confErr) throw confErr
    if (!confirmacao) {
      return erroCliente(
        'Confirmação não encontrada',
        'CONFIRMACAO_NAO_ENCONTRADA',
        404,
      )
    }

    if (confirmacao.status !== 'pendente') {
      // Já processada — não duplica
      return ok({
        ignorado: true,
        motivo: 'confirmação não está mais pendente',
        confirmacao_id: confirmacao.id,
        status_atual: confirmacao.status,
      })
    }

    const respondidaEm = new Date().toISOString()
    const { error: updErr } = await supabase
      .from('confirmacoes')
      .update({
        status: 'confirmado',
        tipo_confirmacao: tipoConfirmacao,
        origem: 'whatsapp',
        respondida_em: respondidaEm,
      })
      .eq('id', confirmacao.id)
    if (updErr) throw updErr

    const passageiro: any = (confirmacao as any).passageiros
    const motoristaId: string | undefined = passageiro?.rotas?.motorista_id

    // Notificação in-app para o motorista
    if (motoristaId && passageiro?.nome_completo) {
      const acao = tipoConfirmacao === 'nao_vai' ? 'recusou presença' : 'confirmou presença'
      try {
        await supabase.from('notificacoes').insert({
          motorista_id: motoristaId,
          titulo: 'Resposta recebida',
          mensagem: `${passageiro.nome_completo} ${acao}`,
          tipo: 'whatsapp_resposta',
        })
      } catch (e) {
        console.error('Falha ao registrar notificação whatsapp_resposta', e)
      }
    }

    // Busca instância do motorista (para registrar no log)
    let instanciaId: string | null = null
    if (motoristaId) {
      const { data: inst } = await supabase
        .from('instancias_whatsapp')
        .select('id')
        .eq('motorista_id', motoristaId)
        .maybeSingle()
      instanciaId = inst?.id ?? null
    }

    // Registra a mensagem recebida
    const conteudoEntrada =
      listResp?.title ?? `Resposta: ${tipoConfirmacao} (opção ${numero})`
    const whatsappMsgId: string | null = data?.key?.id ?? null

    await supabase.from('mensagens').insert({
      instancia_whatsapp_id: instanciaId,
      passageiro_id: passageiro?.id ?? null,
      confirmacao_id: confirmacao.id,
      conteudo: String(conteudoEntrada),
      direcao: 'entrada',
      tipo: 'resposta_confirmacao',
      status_envio: 'entregue',
      whatsapp_message_id: whatsappMsgId,
      resposta_recebida_em: respondidaEm,
    })

    // Envia confirmação de retorno
    const telefone = passageiro?.telefone_responsavel as string | undefined
    const nome = passageiro?.nome_completo as string | undefined
    if (telefone && nome) {
      const textoRetorno = montarRespostaConfirmacao(tipoConfirmacao, nome)
      try {
        const resp = await evolutionEnviarTexto(telefone, textoRetorno)
        await supabase.from('mensagens').insert({
          instancia_whatsapp_id: instanciaId,
          passageiro_id: passageiro.id,
          confirmacao_id: confirmacao.id,
          conteudo: textoRetorno,
          direcao: 'saida',
          tipo: 'resposta_confirmacao',
          status_envio: 'enviada',
          whatsapp_message_id: resp.key?.id ?? null,
        })
      } catch (e) {
        await supabase.from('mensagens').insert({
          instancia_whatsapp_id: instanciaId,
          passageiro_id: passageiro.id,
          confirmacao_id: confirmacao.id,
          conteudo: textoRetorno,
          direcao: 'saida',
          tipo: 'resposta_confirmacao',
          status_envio: 'falha',
        })
        console.error('Falha ao enviar confirmação de retorno', e)
      }
    }

    return ok({
      sucesso: true,
      confirmacao_id: confirmacao.id,
      status: 'confirmado',
      tipo: tipoConfirmacao,
    })
  } catch (err) {
    return erroServidor(err)
  }
})
