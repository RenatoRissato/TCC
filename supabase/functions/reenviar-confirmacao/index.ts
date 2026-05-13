// deno-lint-ignore-file no-explicit-any
import { handlePreflight } from '../_shared/cors.ts'
import { ok, erroCliente, erroServidor } from '../_shared/responses.ts'
import { AuthError, getMotorista } from '../_shared/auth.ts'
import { evolutionEnviarTexto } from '../_shared/evolution.ts'
import {
  aplicarVariaveis,
  obterSaudacaoBrasil,
} from '../_shared/viagem.ts'

interface Body {
  confirmacao_id?: string
}

function formatarDataBR(date = new Date()): string {
  return date.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
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

    const confirmacaoId = body.confirmacao_id?.trim()
    if (!confirmacaoId) {
      return erroCliente(
        'confirmacao_id é obrigatório',
        'CONFIRMACAO_OBRIGATORIA',
        400,
      )
    }

    // Busca confirmação + valida pertencimento via rota
    const { data: confirmacao, error: confErr } = await supabase
      .from('confirmacoes')
      .select(
        'id, status, viagem_id, passageiro_id, viagens!inner(rotas!inner(id, nome, motorista_id)), passageiros(id, nome_completo, telefone_responsavel)',
      )
      .eq('id', confirmacaoId)
      .maybeSingle()

    if (confErr) throw confErr
    const rotaInfo = (confirmacao as any)?.viagens?.rotas
    if (!confirmacao || rotaInfo?.motorista_id !== motorista.id) {
      return erroCliente(
        'Confirmação não encontrada',
        'CONFIRMACAO_NAO_ENCONTRADA',
        403,
      )
    }

    if (confirmacao.status !== 'pendente') {
      return erroCliente(
        'Confirmação já foi respondida',
        'CONFIRMACAO_JA_RESPONDIDA',
        409,
      )
    }

    const passageiro = (confirmacao as any).passageiros
    if (!passageiro?.telefone_responsavel) {
      return erroCliente(
        'Passageiro sem telefone do responsável',
        'TELEFONE_AUSENTE',
        400,
      )
    }

    // Pre-flight: checa se o WhatsApp do motorista está conectado antes de
    // tentar enviar. Sem isso, o erro vem como string genérica da Evolution
    // ("Connection state: close") que confunde o usuário.
    const { data: instCheck } = await supabase
      .from('instancias_whatsapp')
      .select('status_conexao')
      .eq('motorista_id', motorista.id)
      .maybeSingle()

    if (!instCheck || instCheck.status_conexao !== 'conectado') {
      return erroCliente(
        'WhatsApp não está conectado. Vá em "Painel WhatsApp" e conecte sua conta antes de reenviar.',
        'WHATSAPP_DESCONECTADO',
        503,
      )
    }

    // Template ativo + opções
    const { data: template, error: tplErr } = await supabase
      .from('templates_mensagem')
      .select('id, cabecalho, rodape')
      .eq('motorista_id', motorista.id)
      .eq('ativo', true)
      .maybeSingle()
    if (tplErr) throw tplErr
    if (!template) {
      return erroCliente(
        'Motorista sem template ativo',
        'TEMPLATE_AUSENTE',
        400,
      )
    }
    const { data: opcoes, error: opErr } = await supabase
      .from('opcoes_resposta')
      .select('numero, texto_exibido')
      .eq('template_id', template.id)
      .eq('ativo', true)
      .order('numero', { ascending: true })
    if (opErr) throw opErr
    const opcoesAtivas = (opcoes ?? []) as { numero: number; texto_exibido: string }[]
    if (opcoesAtivas.length === 0) {
      return erroCliente(
        'Template sem opções ativas',
        'OPCOES_AUSENTES',
        400,
      )
    }

    const dataFmt = formatarDataBR()
    const saudacao = obterSaudacaoBrasil()
    const cabecalho = aplicarVariaveis(
      template.cabecalho,
      passageiro.nome_completo,
      dataFmt,
      saudacao,
    )
    const rodape = aplicarVariaveis(
      template.rodape,
      passageiro.nome_completo,
      dataFmt,
      saudacao,
    )

    // Mesma estrutura de mensagem usada em viagem.ts (sendText com opções
    // numeradas no corpo). Mantém UX consistente entre envio automático e
    // reenvio manual — o responsável vê exatamente o mesmo formato.
    const corpoMensagem = [
      cabecalho,
      '',
      'Responda com o número da opção desejada:',
      ...opcoesAtivas.map((o) => `${o.numero} - ${o.texto_exibido}`),
      '',
      rodape,
    ].join('\n')

    // Conta tentativas anteriores para essa confirmação
    const { count: tentativasAnteriores } = await supabase
      .from('mensagens')
      .select('id', { count: 'exact', head: true })
      .eq('confirmacao_id', confirmacao.id)
      .eq('tipo', 'confirmacao_diaria')
      .eq('direcao', 'saida')

    const tentativaAtual = (tentativasAnteriores ?? 0) + 1

    // Instância
    const { data: instancia } = await supabase
      .from('instancias_whatsapp')
      .select('id')
      .eq('motorista_id', motorista.id)
      .maybeSingle()

    let resp
    try {
      resp = await evolutionEnviarTexto(
        passageiro.telefone_responsavel,
        corpoMensagem,
      )
    } catch (e) {
      const erroEvolution = e instanceof Error ? e.message : String(e)
      console.error(
        '[reenviar-confirmacao] sendText FALHOU',
        JSON.stringify({
          passageiro: passageiro.nome_completo,
          telefone: passageiro.telefone_responsavel,
          confirmacao_id: confirmacao.id,
          tentativa: tentativaAtual,
          erro: erroEvolution,
        }),
      )
      const { data: msgFalha } = await supabase
        .from('mensagens')
        .insert({
          instancia_whatsapp_id: instancia?.id ?? null,
          passageiro_id: passageiro.id,
          confirmacao_id: confirmacao.id,
          conteudo: corpoMensagem,
          direcao: 'saida',
          tipo: 'confirmacao_diaria',
          status_envio: 'falha',
          tentativas: tentativaAtual,
        })
        .select('id')
        .single()
      if (msgFalha?.id) {
        await supabase.from('log_mensagens').insert({
          mensagem_id: msgFalha.id,
          evento: 'reenvio_falha',
          detalhes: erroEvolution,
        })
      }
      return erroCliente(
        'Falha ao reenviar via WhatsApp. Confira a conexão da Evolution API.',
        'EVOLUTION_FALHOU',
        503,
        { detalhes: erroEvolution },
      )
    }

    const { data: msgOk } = await supabase
      .from('mensagens')
      .insert({
        instancia_whatsapp_id: instancia?.id ?? null,
        passageiro_id: passageiro.id,
        confirmacao_id: confirmacao.id,
        conteudo: corpoMensagem,
        direcao: 'saida',
        tipo: 'confirmacao_diaria',
        status_envio: 'enviada',
        whatsapp_message_id: resp.key?.id ?? null,
        tentativas: tentativaAtual,
      })
      .select('id')
      .single()

    if (msgOk?.id) {
      await supabase.from('log_mensagens').insert({
        mensagem_id: msgOk.id,
        evento: 'reenvio',
        detalhes: `tentativa ${tentativaAtual}`,
      })
    }

    return ok({
      sucesso: true,
      confirmacao_id: confirmacao.id,
      tentativa: tentativaAtual,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return erroCliente(err.message, err.codigo, err.status)
    }
    return erroServidor(err)
  }
})
