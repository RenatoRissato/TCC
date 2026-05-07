// deno-lint-ignore-file no-explicit-any
import { SupabaseClient } from '@supabase/supabase-js'
import { criarClienteServico } from './auth.ts'
import {
  evolutionEnviarLista,
  EvolutionResposta,
  OpcaoLista,
} from './evolution.ts'

export interface ResultadoEnvio {
  passageiro_id: string
  nome: string
  sucesso: boolean
  erro?: string
}

export interface ResumoViagem {
  viagem_id: string
  total_passageiros: number
  mensagens_enviadas: number
  mensagens_com_falha: number
  resultados: ResultadoEnvio[]
  ja_existia: boolean
}

interface PassageiroAtivo {
  id: string
  nome_completo: string
  telefone_responsavel: string
  ordem_na_rota: number
}

interface OpcaoTemplate {
  numero: number
  texto_exibido: string
}

interface TemplateAtivo {
  id: string
  cabecalho: string
  rodape: string
  opcoes: OpcaoTemplate[]
}

function formatarDataBR(date = new Date()): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function aplicarVariaveis(
  texto: string,
  passageiroNome: string,
  data: string,
): string {
  return texto
    .replaceAll('{nome_passageiro}', passageiroNome)
    .replaceAll('{data_formatada}', data)
}

async function buscarTemplateAtivo(
  supabase: SupabaseClient,
  motoristaId: string,
): Promise<TemplateAtivo> {
  const { data: template, error } = await supabase
    .from('templates_mensagem')
    .select('id, cabecalho, rodape')
    .eq('motorista_id', motoristaId)
    .eq('ativo', true)
    .maybeSingle()

  if (error) throw new Error(`Erro ao buscar template: ${error.message}`)
  if (!template) {
    throw new Error('Motorista não possui template de mensagem ativo')
  }

  const { data: opcoes, error: errOp } = await supabase
    .from('opcoes_resposta')
    .select('numero, texto_exibido')
    .eq('template_id', template.id)
    .eq('ativo', true)
    .order('numero', { ascending: true })

  if (errOp) throw new Error(`Erro ao buscar opções: ${errOp.message}`)

  return {
    id: template.id,
    cabecalho: template.cabecalho,
    rodape: template.rodape,
    opcoes: (opcoes ?? []) as OpcaoTemplate[],
  }
}

async function buscarInstanciaWhatsApp(
  supabase: SupabaseClient,
  motoristaId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('instancias_whatsapp')
    .select('id')
    .eq('motorista_id', motoristaId)
    .maybeSingle()
  return data?.id ?? null
}

export async function processarIniciarViagem(
  supabase: SupabaseClient,
  motoristaId: string,
  rotaId: string,
): Promise<ResumoViagem> {
  // 1. Verifica rota
  const { data: rota, error: rotaErr } = await supabase
    .from('rotas')
    .select('id, motorista_id, nome')
    .eq('id', rotaId)
    .maybeSingle()

  if (rotaErr) throw new Error(`Erro ao buscar rota: ${rotaErr.message}`)
  if (!rota || rota.motorista_id !== motoristaId) {
    const err = new Error('Rota não encontrada ou não pertence ao motorista')
    ;(err as any).codigo = 'ROTA_NAO_ENCONTRADA'
    throw err
  }

  // 2. Tenta criar viagem; se já existir (rota_id + data), busca a existente
  const hoje = new Date().toISOString().slice(0, 10)
  let viagemJaExistia = false

  const { data: viagemNova, error: insertErr } = await supabase
    .from('viagens')
    .insert({
      rota_id: rotaId,
      data: hoje,
      status: 'em_andamento',
    })
    .select('id')
    .maybeSingle()

  let viagemId: string
  if (insertErr) {
    // Provavelmente unique constraint — busca a existente
    const { data: existente } = await supabase
      .from('viagens')
      .select('id')
      .eq('rota_id', rotaId)
      .eq('data', hoje)
      .maybeSingle()
    if (!existente) throw new Error(`Erro ao criar viagem: ${insertErr.message}`)
    viagemId = existente.id
    viagemJaExistia = true
  } else if (!viagemNova) {
    throw new Error('Falha ao criar viagem (sem retorno do insert)')
  } else {
    viagemId = viagemNova.id
  }

  // 3. Garante lista_diaria (idempotente — viagem_id é unique)
  if (!viagemJaExistia) {
    await supabase
      .from('listas_diarias')
      .insert({ viagem_id: viagemId })
      .select('id')
      .maybeSingle()
  }

  // 4. Busca passageiros ativos
  const { data: passageiros, error: paxErr } = await supabase
    .from('passageiros')
    .select('id, nome_completo, telefone_responsavel, ordem_na_rota')
    .eq('rota_id', rotaId)
    .eq('status', 'ativo')
    .order('ordem_na_rota', { ascending: true })

  if (paxErr) throw new Error(`Erro ao buscar passageiros: ${paxErr.message}`)
  const lista = (passageiros ?? []) as PassageiroAtivo[]
  if (lista.length === 0) {
    const err = new Error('Nenhum passageiro ativo nesta rota')
    ;(err as any).codigo = 'PASSAGEIRO_NAO_ENCONTRADO'
    throw err
  }

  // 5. Template e instância
  const template = await buscarTemplateAtivo(supabase, motoristaId)
  const instanciaId = await buscarInstanciaWhatsApp(supabase, motoristaId)
  const dataFmt = formatarDataBR()

  // 6. Para cada passageiro: confirmação + envio
  const resultados: ResultadoEnvio[] = []
  let enviadas = 0
  let falhas = 0

  for (const pax of lista) {
    // upsert da confirmação (se já existir, recupera)
    let confirmacaoId: string | null = null
    const { data: confExistente } = await supabase
      .from('confirmacoes')
      .select('id, status')
      .eq('viagem_id', viagemId)
      .eq('passageiro_id', pax.id)
      .maybeSingle()

    if (confExistente) {
      confirmacaoId = confExistente.id
    } else {
      const { data: confNova, error: confErr } = await supabase
        .from('confirmacoes')
        .insert({
          viagem_id: viagemId,
          passageiro_id: pax.id,
          status: 'pendente',
        })
        .select('id')
        .single()
      if (confErr) {
        resultados.push({
          passageiro_id: pax.id,
          nome: pax.nome_completo,
          sucesso: false,
          erro: `Falha ao criar confirmação: ${confErr.message}`,
        })
        falhas++
        continue
      }
      confirmacaoId = confNova.id
    }

    // Monta mensagem
    const cabecalho = aplicarVariaveis(
      template.cabecalho,
      pax.nome_completo,
      dataFmt,
    )
    const rodape = aplicarVariaveis(template.rodape, pax.nome_completo, dataFmt)
    const titulo = `Van Escolar — ${rota.nome}`

    const rows: OpcaoLista[] = template.opcoes.map((o) => ({
      title: o.texto_exibido,
      description: `${pax.nome_completo} — ${o.texto_exibido}`,
      rowId: `${o.numero}_${confirmacaoId}`,
    }))

    let resp: EvolutionResposta | null = null
    let envioErro: string | null = null
    try {
      resp = await evolutionEnviarLista(
        pax.telefone_responsavel,
        titulo,
        cabecalho,
        rodape,
        rows,
      )
    } catch (e) {
      envioErro = e instanceof Error ? e.message : String(e)
    }

    // Conteúdo legível para o log
    const corpoLegivel = [
      cabecalho,
      ...template.opcoes.map((o) => `${o.numero} - ${o.texto_exibido}`),
      rodape,
    ].join('\n')

    if (resp && !envioErro) {
      await supabase.from('mensagens').insert({
        instancia_whatsapp_id: instanciaId,
        passageiro_id: pax.id,
        confirmacao_id: confirmacaoId,
        conteudo: corpoLegivel,
        direcao: 'saida',
        tipo: 'confirmacao_diaria',
        status_envio: 'enviada',
        whatsapp_message_id: resp.key?.id ?? null,
        tentativas: 1,
      })
      resultados.push({
        passageiro_id: pax.id,
        nome: pax.nome_completo,
        sucesso: true,
      })
      enviadas++
    } else {
      await supabase.from('mensagens').insert({
        instancia_whatsapp_id: instanciaId,
        passageiro_id: pax.id,
        confirmacao_id: confirmacaoId,
        conteudo: corpoLegivel,
        direcao: 'saida',
        tipo: 'confirmacao_diaria',
        status_envio: 'falha',
        tentativas: 1,
      })
      resultados.push({
        passageiro_id: pax.id,
        nome: pax.nome_completo,
        sucesso: false,
        erro: envioErro ?? 'Erro desconhecido',
      })
      falhas++
    }
  }

  // Notificação in-app — só na primeira vez que a viagem é iniciada.
  // Usa service role porque INSERT em notificacoes não é exposto ao role authenticated.
  if (!viagemJaExistia) {
    try {
      const servico = criarClienteServico()
      await servico.from('notificacoes').insert({
        motorista_id: motoristaId,
        titulo: 'Viagem iniciada',
        mensagem: `Rota ${rota.nome} iniciada com ${lista.length} passageiros`,
        tipo: 'viagem_iniciada',
      })
    } catch (e) {
      console.error('Falha ao registrar notificação viagem_iniciada', e)
    }
  }

  return {
    viagem_id: viagemId,
    total_passageiros: lista.length,
    mensagens_enviadas: enviadas,
    mensagens_com_falha: falhas,
    resultados,
    ja_existia: viagemJaExistia,
  }
}
