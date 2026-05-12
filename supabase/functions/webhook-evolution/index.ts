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

    // Ignora mensagens enviadas pelo próprio bot (fromMe=true).
    // Sem esse check, as mensagens de saída (sendText e respostas automáticas)
    // que voltam pelo webhook seriam interpretadas como resposta do passageiro.
    if (data?.key?.fromMe === true) {
      return ok({ ignorado: true, motivo: 'mensagem enviada pelo próprio bot' })
    }

    const supabase = criarClienteServico()

    // ---- Identificar tipo de resposta ----
    // (1) Texto puro com dígito 1-4 (novo modelo: sendText com opções numeradas)
    // (2) listResponseMessage (modelo antigo, mantido por compat — pode parar
    //     de funcionar quando o Baileys/WhatsApp restringir listas)
    let numero: string | null = null
    let confirmacaoIdFromRow: string | null = null
    let conteudoEntrada: string | null = null

    const listResp = data?.message?.listResponseMessage
    if (listResp) {
      const selectedRowId: string | undefined =
        listResp?.singleSelectReply?.selectedRowId
      if (selectedRowId) {
        const idx = selectedRowId.indexOf('_')
        if (idx > 0) {
          numero = selectedRowId.slice(0, idx)
          confirmacaoIdFromRow = selectedRowId.slice(idx + 1)
          conteudoEntrada = listResp?.title ?? null
        }
      }
    }

    if (!numero) {
      // Tenta texto puro
      const textoPuro: string | undefined =
        data?.message?.conversation ??
        data?.message?.extendedTextMessage?.text
      if (textoPuro && typeof textoPuro === 'string') {
        // Aceita: "1", "1.", "1 ", "1 - Ida e volta", "  1  ", etc.
        // Pega o primeiro dígito 1-4 que apareça no início, possivelmente
        // depois de algum espaço/caractere comum.
        const match = textoPuro.trim().match(/^([1-4])\b/)
        if (match) {
          numero = match[1]
          conteudoEntrada = textoPuro
        }
      }
    }

    if (!numero) {
      return ok({
        ignorado: true,
        motivo: 'mensagem não é resposta de confirmação (sem dígito 1-4 e sem listResponse)',
      })
    }

    const tipoConfirmacao = NUMERO_PARA_TIPO[numero]
    if (!tipoConfirmacao) {
      return erroCliente(
        `Número ${numero} não mapeado para tipo de confirmação`,
        'NUMERO_INVALIDO',
        400,
      )
    }

    // ---- Resolver qual confirmação esta resposta atualiza ----
    // Caso (1) listResponse → usamos o confirmacaoId que veio embutido no rowId
    // Caso (2) texto puro → buscamos a confirmação pendente mais recente do
    //          passageiro identificado pelo número de telefone do remetente
    let confirmacao: any = null

    if (confirmacaoIdFromRow) {
      const { data: c, error: cErr } = await supabase
        .from('confirmacoes')
        .select(
          'id, status, viagem_id, passageiro_id, passageiros(id, nome_completo, telefone_responsavel, rota_id, rotas(motorista_id))',
        )
        .eq('id', confirmacaoIdFromRow)
        .maybeSingle()
      if (cErr) throw cErr
      confirmacao = c
    } else {
      // Texto puro — busca pelo telefone do remetente
      const remoteJid: string | undefined = data?.key?.remoteJid
      const telefoneRemetente = remoteJid
        ? remoteJid.split('@')[0].replace(/\D/g, '')
        : ''
      if (!telefoneRemetente) {
        return ok({ ignorado: true, motivo: 'sem telefone de remetente identificável' })
      }

      const { data: pax, error: paxErr } = await supabase
        .from('passageiros')
        .select(
          'id, nome_completo, telefone_responsavel, rota_id, rotas(motorista_id)',
        )
        .eq('telefone_responsavel', telefoneRemetente)
        .eq('status', 'ativo')
        .maybeSingle()
      if (paxErr) throw paxErr
      if (!pax) {
        return ok({
          ignorado: true,
          motivo: `remetente ${telefoneRemetente} não é passageiro ativo`,
        })
      }

      // Pega a confirmação pendente mais recente desse passageiro
      const { data: confPendente, error: cErr } = await supabase
        .from('confirmacoes')
        .select(
          'id, status, viagem_id, passageiro_id, passageiros(id, nome_completo, telefone_responsavel, rota_id, rotas(motorista_id))',
        )
        .eq('passageiro_id', pax.id)
        .eq('status', 'pendente')
        .order('criada_em', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cErr) throw cErr
      confirmacao = confPendente
    }

    if (!confirmacao) {
      return ok({
        ignorado: true,
        motivo: 'sem confirmação pendente correspondente a esta resposta',
      })
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
    const conteudoFinal =
      conteudoEntrada ?? `Resposta: ${tipoConfirmacao} (opção ${numero})`
    const whatsappMsgId: string | null = data?.key?.id ?? null

    await supabase.from('mensagens').insert({
      instancia_whatsapp_id: instanciaId,
      passageiro_id: passageiro?.id ?? null,
      confirmacao_id: confirmacao.id,
      conteudo: String(conteudoFinal),
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
