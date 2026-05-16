// deno-lint-ignore-file no-explicit-any
import { SupabaseClient } from '@supabase/supabase-js'
import { criarClienteServico } from './auth.ts'
import {
  evolutionEnviarTexto,
  EvolutionResposta,
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

const TIME_ZONE_BR = 'America/Sao_Paulo'

export function dataBrasilISO(date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE_BR,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const get = (type: string) =>
    partes.find((p) => p.type === type)?.value ?? ''

  return `${get('year')}-${get('month')}-${get('day')}`
}

function formatarDataBR(date = new Date()): string {
  return date.toLocaleDateString('pt-BR', {
    timeZone: TIME_ZONE_BR,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Retorna a saudação adequada para o horário atual em Brasília:
 *   - 00h às 11h59 → "Bom dia"
 *   - 12h às 17h59 → "Boa tarde"
 *   - 18h às 23h59 → "Boa noite"
 *
 * Exportada porque é usada também em `reenviar-confirmacao` (mesmo cálculo,
 * sem duplicar a lógica de timezone).
 */
export function obterSaudacaoBrasil(date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE_BR,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const hora = parseInt(
    partes.find((p) => p.type === 'hour')?.value ?? '0',
    10,
  )
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function aplicarVariaveis(
  texto: string,
  passageiroNome: string,
  data: string,
  saudacao: string,
): string {
  return texto
    .replaceAll('{nome_passageiro}', passageiroNome)
    .replaceAll('{data_formatada}', data)
    .replaceAll('{saudacao}', saudacao)
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

export type DirecaoViagem = 'buscar' | 'retorno'

export async function processarIniciarViagem(
  supabase: SupabaseClient,
  motoristaId: string,
  rotaId: string,
  options: { dataViagem?: string; enviarMensagens?: boolean; direcao?: DirecaoViagem | null } = {},
): Promise<ResumoViagem> {
  // Regra de negócio: o botão "play" (iniciar viagem) NÃO dispara WhatsApp.
  // Mensagens automáticas saem apenas do cron `automacao-diaria` no horário
  // configurado, ou via `reenviar-confirmacao` quando o motorista pede
  // explicitamente. Default false; o cron passa true.
  const enviarMensagens = options.enviarMensagens === true
  const direcao: DirecaoViagem | null =
    options.direcao === 'buscar' || options.direcao === 'retorno'
      ? options.direcao
      : null
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
  const hoje = options.dataViagem ?? dataBrasilISO()
  let viagemJaExistia = false

  const { data: viagemNova, error: insertErr } = await supabase
    .from('viagens')
    .insert({
      rota_id: rotaId,
      data: hoje,
      status: 'em_andamento',
      direcao,
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
    // Viagem já existe (caso típico: motorista iniciou "buscar" cedo e agora
    // está iniciando "retorno"). Atualiza só a direção — nada mais.
    if (direcao) {
      await supabase
        .from('viagens')
        .update({ direcao })
        .eq('id', viagemId)
    }
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
  // Saudação calculada UMA vez no momento do disparo. Se uma viagem começar
  // 11:58 e o último passageiro só receber às 12:01, todos veem "Bom dia"
  // — consistente, ninguém recebe metade da turma com saudação diferente.
  const saudacao = obterSaudacaoBrasil()

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

    // Monta mensagem em TEXTO PURO com as opções numeradas no corpo.
    // Decisão arquitetural: trocamos sendList por sendText porque o Baileys
    // (servidor Evolution) tem bugs intermitentes na codificação de mensagens
    // interativas ("TypeError: this.isZero is not a function"), e o WhatsApp
    // restringe cada vez mais botões/listas para APIs não-oficiais. Texto
    // puro funciona em qualquer versão e nunca é bloqueado.
    const cabecalho = aplicarVariaveis(
      template.cabecalho,
      pax.nome_completo,
      dataFmt,
      saudacao,
    )
    const rodape = aplicarVariaveis(
      template.rodape,
      pax.nome_completo,
      dataFmt,
      saudacao,
    )

    const corpoLegivel = [
      cabecalho,
      '',
      'Responda com o número da opção desejada:',
      ...template.opcoes.map((o) => `${o.numero} - ${o.texto_exibido}`),
      '',
      rodape,
    ].join('\n')

    // Bloco de envio só roda quando `enviarMensagens=true`. Quando o
    // motorista aperta "play" no app, esse trecho fica desligado — a viagem
    // é criada (com as confirmações pendentes) mas nenhuma mensagem sai
    // pelo WhatsApp. O envio fica delegado ao cron `automacao-diaria` e ao
    // botão "reenviar" manual.
    if (!enviarMensagens) {
      resultados.push({
        passageiro_id: pax.id,
        nome: pax.nome_completo,
        sucesso: true,
      })
      continue
    }

    let resp: EvolutionResposta | null = null
    let envioErro: string | null = null
    try {
      resp = await evolutionEnviarTexto(pax.telefone_responsavel, corpoLegivel)
      console.log(
        '[processarIniciarViagem] sendText OK',
        JSON.stringify({
          passageiro: pax.nome_completo,
          telefone: pax.telefone_responsavel,
          rota: rota.nome,
          whatsapp_message_id: resp?.key?.id ?? null,
        }),
      )
    } catch (e) {
      envioErro = e instanceof Error ? e.message : String(e)
      console.error(
        '[processarIniciarViagem] sendText FALHOU',
        JSON.stringify({
          passageiro: pax.nome_completo,
          telefone: pax.telefone_responsavel,
          rota: rota.nome,
          rota_id: rotaId,
          erro: envioErro,
        }),
      )
    }

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
