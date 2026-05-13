// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  EstadoConversaConfirmacao,
  TipoConfirmacao,
} from './conversaValidacao.ts'
import { dataBrasilISO } from './viagem.ts'

export interface PassageiroConversa {
  id: string
  nome_completo: string
  telefone_responsavel: string
  rota_id: string
  rotas?: { motorista_id?: string } | null
}

export interface ConfirmacaoConversa {
  id: string
  status: 'pendente' | 'confirmado' | 'ausente'
  tipo_confirmacao: TipoConfirmacao | null
  viagem_id: string
  passageiro_id: string
  respondida_em: string | null
  passageiros: PassageiroConversa
  viagens?: { data?: string; rota_id?: string } | null
}

export interface EstadoConversaRow {
  id: string
  passageiro_id: string
  viagem_id: string | null
  confirmacao_id: string | null
  data: string
  estado: EstadoConversaConfirmacao
  tipo_confirmacao_anterior: TipoConfirmacao | null
  alterada: boolean
}

export function normalizarTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '')
}

function candidatosTelefone(telefone: string): string[] {
  const limpo = normalizarTelefone(telefone)
  const candidatos = new Set<string>([limpo])
  if (limpo.length === 10 || limpo.length === 11) candidatos.add(`55${limpo}`)
  if (limpo.startsWith('55')) candidatos.add(limpo.slice(2))
  return [...candidatos].filter(Boolean)
}

/**
 * Identifica o motorista DONO da instância de WhatsApp que recebeu a
 * mensagem. Como o `EVOLUTION_INSTANCE_NAME` é global (single-tenant na
 * Evolution), só pode haver um motorista com `status_conexao='conectado'`
 * em um dado instante. Em caso de mais de um (race condition transitória),
 * pegamos o de `data_ultima_conexao` mais recente.
 *
 * Esse motorista delimita o universo de passageiros que o webhook pode
 * responder. Sem isso, um passageiro de outro motorista com mesmo
 * telefone poderia ser escolhido — exatamente o bug reportado em produção.
 */
export async function obterMotoristaDaInstanciaAtiva(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('instancias_whatsapp')
    .select('motorista_id, data_ultima_conexao')
    .eq('status_conexao', 'conectado')
    .order('data_ultima_conexao', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error(
      '[conversa] obterMotoristaDaInstanciaAtiva: erro consultando instancia',
      JSON.stringify({ erro: error.message }),
    )
    return null
  }
  if (!data) {
    console.log(
      '[conversa] obterMotoristaDaInstanciaAtiva: nenhuma instancia conectada',
    )
    return null
  }
  return (data as { motorista_id: string }).motorista_id
}

export async function buscarPassageirosPorTelefone(
  supabase: SupabaseClient,
  telefone: string,
  motoristaId: string | null = null,
): Promise<PassageiroConversa[]> {
  const candidatos = candidatosTelefone(telefone)
  const { data, error } = await supabase
    .from('passageiros')
    .select('id, nome_completo, telefone_responsavel, rota_id, rotas(motorista_id)')
    .in('telefone_responsavel', candidatos)
    .eq('status', 'ativo')

  if (error) {
    console.error(
      '[conversa] buscarPassageirosPorTelefone: erro consultando passageiros',
      JSON.stringify({
        telefone_recebido: telefone,
        candidatos,
        erro: error.message,
        code: (error as { code?: string }).code ?? null,
      }),
    )
    return []
  }
  const todos = (data ?? []) as PassageiroConversa[]

  // Filtra por motorista (regra de negócio: o webhook só responde para
  // passageiros do motorista DONO da instância ativa). Filtro em memória
  // porque o JOIN via PostgREST `rotas.motorista_id` é frágil — preferimos
  // pegar todos e filtrar aqui.
  const lista = motoristaId
    ? todos.filter((p) => p.rotas?.motorista_id === motoristaId)
    : todos

  console.log(
    '[conversa] buscarPassageirosPorTelefone',
    JSON.stringify({
      telefone_recebido: telefone,
      candidatos,
      filtro_motorista_id: motoristaId,
      total_no_banco: todos.length,
      total_no_motorista: lista.length,
      passageiros: lista.map((p) => ({
        id: p.id,
        nome: p.nome_completo,
        rota_id: p.rota_id,
        motorista_id: p.rotas?.motorista_id ?? null,
      })),
    }),
  )
  return lista
}

/**
 * Mantida para compatibilidade — retorna apenas o primeiro candidato.
 * Para o fluxo do webhook, prefira `buscarPassageirosPorTelefone` +
 * `escolherPassageiroDoDia`, que sabe desambiguar quando há múltiplos
 * passageiros com o mesmo telefone (cada um numa rota diferente).
 */
export async function buscarPassageiroPorTelefone(
  supabase: SupabaseClient,
  telefone: string,
  motoristaId: string | null = null,
): Promise<PassageiroConversa | null> {
  const lista = await buscarPassageirosPorTelefone(supabase, telefone, motoristaId)
  return lista[0] ?? null
}

/**
 * Escolhe, entre passageiros que compartilham o mesmo telefone, aquele que
 * o webhook deveria atender AGORA:
 *   1) Tem viagem do dia E confirmação pendente (alvo do fluxo de resposta)
 *   2) Tem viagem do dia (mesmo já confirmado — permite alterar)
 *   3) Fallback: o primeiro da lista
 *
 * Motivação: um motorista pode cadastrar dois passageiros usando o mesmo
 * número de WhatsApp do responsável (ex.: dois irmãos na mesma rota ou em
 * rotas diferentes). Sem desambiguação, a resposta volta com o nome errado.
 */
export async function escolherPassageiroDoDia(
  supabase: SupabaseClient,
  candidatos: PassageiroConversa[],
  data = dataBrasilISO(),
): Promise<PassageiroConversa | null> {
  if (candidatos.length === 0) return null
  if (candidatos.length === 1) return candidatos[0]

  const rotaIds = [...new Set(candidatos.map((p) => p.rota_id).filter(Boolean))]
  if (rotaIds.length === 0) return candidatos[0]

  const { data: viagens, error: viagensErr } = await supabase
    .from('viagens')
    .select('id, rota_id')
    .in('rota_id', rotaIds)
    .eq('data', data)

  if (viagensErr || !viagens || viagens.length === 0) {
    console.log(
      '[conversa] escolherPassageiroDoDia: sem viagem do dia para nenhuma rota — usando o primeiro',
      JSON.stringify({ candidatos_ids: candidatos.map((p) => p.id), rotaIds, data }),
    )
    return candidatos[0]
  }

  const viagemIds = viagens.map((v: { id: string }) => v.id)
  const passageiroIds = candidatos.map((p) => p.id)

  const { data: confs } = await supabase
    .from('confirmacoes')
    .select('passageiro_id, status, viagem_id')
    .in('viagem_id', viagemIds)
    .in('passageiro_id', passageiroIds)

  const confPorPassageiro = new Map<string, { status: string }>()
  for (const c of (confs ?? []) as { passageiro_id: string; status: string }[]) {
    confPorPassageiro.set(c.passageiro_id, { status: c.status })
  }

  const pendente = candidatos.find((p) => confPorPassageiro.get(p.id)?.status === 'pendente')
  if (pendente) {
    console.log(
      '[conversa] escolherPassageiroDoDia: escolhido por confirmacao pendente',
      JSON.stringify({ passageiro_id: pendente.id, nome: pendente.nome_completo }),
    )
    return pendente
  }

  const comConfirmacao = candidatos.find((p) => confPorPassageiro.has(p.id))
  if (comConfirmacao) {
    console.log(
      '[conversa] escolherPassageiroDoDia: escolhido por confirmacao do dia (ja respondida)',
      JSON.stringify({
        passageiro_id: comConfirmacao.id,
        nome: comConfirmacao.nome_completo,
      }),
    )
    return comConfirmacao
  }

  console.log(
    '[conversa] escolherPassageiroDoDia: nenhuma confirmacao do dia para esses passageiros — usando o primeiro',
    JSON.stringify({ candidatos_ids: passageiroIds }),
  )
  return candidatos[0]
}

/**
 * Idempotência do webhook. Evolution / Baileys ocasionalmente reentregam a
 * mesma `messages.upsert` (visto em produção: o usuário envia "1" UMA vez e
 * recebe "Confirmado!" + "Deseja alterar?" — sinal de que o webhook foi
 * processado duas vezes). Aqui checamos `whatsapp_message_id` na tabela
 * `mensagens` (direção entrada). Se já existir, ignoramos.
 */
export async function mensagemJaProcessada(
  supabase: SupabaseClient,
  whatsappMessageId: string | null | undefined,
): Promise<boolean> {
  if (!whatsappMessageId) return false
  const { data, error } = await supabase
    .from('mensagens')
    .select('id')
    .eq('whatsapp_message_id', whatsappMessageId)
    .eq('direcao', 'entrada')
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error(
      '[conversa] mensagemJaProcessada: erro na checagem — segue o fluxo',
      JSON.stringify({
        whatsapp_message_id: whatsappMessageId,
        erro: error.message,
      }),
    )
    return false
  }
  return !!data
}

/**
 * Busca a confirmação pendente/respondida do dia atual para um passageiro.
 *
 * Implementação em DUAS queries explícitas (em vez de embed `viagens!inner`
 * com filtro `viagens.data=...`). Motivo: o filtro em embed do PostgREST é
 * sensível ao formato exato da string da relação no select e a mudanças de
 * cardinalidade — em ambientes onde isso se desalinha, a query retorna 0
 * linhas em SILÊNCIO, fazendo o webhook cair sempre no fallback "Não
 * encontrei confirmação ativa".
 *
 * Fluxo:
 *   1) Localiza a viagem do dia para a rota do passageiro (rota_id + data)
 *   2) Busca a confirmação por (viagem_id, passageiro_id) — UNIQUE no schema
 *
 * Mantém o tipo `ConfirmacaoConversa` original, sintetizando o campo
 * `viagens` a partir da viagem encontrada — preserva todos os callers.
 */
export async function buscarConfirmacaoDoDia(
  supabase: SupabaseClient,
  passageiroId: string,
  rotaId: string,
  data = dataBrasilISO(),
): Promise<ConfirmacaoConversa | null> {
  if (!rotaId) {
    console.log(
      '[conversa] buscarConfirmacaoDoDia: rotaId ausente — fallback null',
      JSON.stringify({ passageiro_id: passageiroId, data }),
    )
    return null
  }

  const { data: viagem, error: viagemErr } = await supabase
    .from('viagens')
    .select('id, data, rota_id')
    .eq('rota_id', rotaId)
    .eq('data', data)
    .maybeSingle()

  if (viagemErr) {
    // Não propaga: o webhook precisa SEMPRE responder algo ao responsável.
    // Em caso de erro de query, log explícito + retorna null para o caller
    // cair no fallback "Não encontrei confirmação", em vez de 500 silencioso.
    console.error(
      '[conversa] buscarConfirmacaoDoDia: erro consultando viagens',
      JSON.stringify({
        passageiro_id: passageiroId,
        rota_id: rotaId,
        data,
        erro: viagemErr.message,
        code: (viagemErr as { code?: string }).code ?? null,
      }),
    )
    return null
  }
  if (!viagem) {
    console.log(
      '[conversa] buscarConfirmacaoDoDia: viagem do dia inexistente',
      JSON.stringify({ passageiro_id: passageiroId, rota_id: rotaId, data }),
    )
    return null
  }

  const { data: conf, error: confErr } = await supabase
    .from('confirmacoes')
    .select(
      'id, status, tipo_confirmacao, viagem_id, passageiro_id, respondida_em, passageiros(id, nome_completo, telefone_responsavel, rota_id, rotas(motorista_id))',
    )
    .eq('viagem_id', viagem.id)
    .eq('passageiro_id', passageiroId)
    .maybeSingle()

  if (confErr) {
    console.error(
      '[conversa] buscarConfirmacaoDoDia: erro consultando confirmacoes',
      JSON.stringify({
        passageiro_id: passageiroId,
        viagem_id: viagem.id,
        rota_id: rotaId,
        data,
        erro: confErr.message,
        code: (confErr as { code?: string }).code ?? null,
      }),
    )
    return null
  }
  if (!conf) {
    console.log(
      '[conversa] buscarConfirmacaoDoDia: viagem encontrada, confirmacao ausente',
      JSON.stringify({
        passageiro_id: passageiroId,
        viagem_id: viagem.id,
        rota_id: rotaId,
        data,
      }),
    )
    return null
  }

  console.log(
    '[conversa] buscarConfirmacaoDoDia: confirmacao localizada',
    JSON.stringify({
      passageiro_id: passageiroId,
      viagem_id: viagem.id,
      confirmacao_id: (conf as { id: string }).id,
      status: (conf as { status: string }).status,
      data,
    }),
  )

  return {
    ...(conf as Record<string, unknown>),
    viagens: { data: viagem.data, rota_id: viagem.rota_id },
  } as unknown as ConfirmacaoConversa
}

export async function buscarConfirmacaoPorId(
  supabase: SupabaseClient,
  confirmacaoId: string,
): Promise<ConfirmacaoConversa | null> {
  const { data, error } = await supabase
    .from('confirmacoes')
    .select(
      'id, status, tipo_confirmacao, viagem_id, passageiro_id, respondida_em, passageiros(id, nome_completo, telefone_responsavel, rota_id, rotas(motorista_id)), viagens(data, rota_id)',
    )
    .eq('id', confirmacaoId)
    .maybeSingle()

  if (error) throw error
  return data as ConfirmacaoConversa | null
}

export async function buscarEstadoConversa(
  supabase: SupabaseClient,
  passageiroId: string,
  data = dataBrasilISO(),
): Promise<EstadoConversaRow | null> {
  const { data: estado, error } = await supabase
    .from('conversas_confirmacao_whatsapp')
    .select('*')
    .eq('passageiro_id', passageiroId)
    .eq('data', data)
    .maybeSingle()

  if (error) throw error
  return estado as EstadoConversaRow | null
}

export async function salvarEstadoConversa(
  supabase: SupabaseClient,
  input: {
    passageiroId: string
    viagemId?: string | null
    confirmacaoId?: string | null
    data?: string
    estado: EstadoConversaConfirmacao
    tipoConfirmacaoAnterior?: TipoConfirmacao | null
    alterada?: boolean
  },
): Promise<void> {
  const data = input.data ?? dataBrasilISO()
  const { error } = await supabase
    .from('conversas_confirmacao_whatsapp')
    .upsert(
      {
        passageiro_id: input.passageiroId,
        viagem_id: input.viagemId ?? null,
        confirmacao_id: input.confirmacaoId ?? null,
        data,
        estado: input.estado,
        tipo_confirmacao_anterior: input.tipoConfirmacaoAnterior ?? null,
        alterada: input.alterada ?? false,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'passageiro_id,data' },
    )

  if (error) throw error
}

export async function atualizarConfirmacao(
  supabase: SupabaseClient,
  confirmacaoId: string,
  tipo: TipoConfirmacao,
): Promise<void> {
  const { error } = await supabase
    .from('confirmacoes')
    .update({
      status: 'confirmado',
      tipo_confirmacao: tipo,
      origem: 'whatsapp',
      respondida_em: new Date().toISOString(),
    })
    .eq('id', confirmacaoId)

  if (error) throw error
}

export async function obterInstanciaIdDoMotorista(
  supabase: SupabaseClient,
  motoristaId: string | null | undefined,
): Promise<string | null> {
  if (!motoristaId) return null
  const { data } = await supabase
    .from('instancias_whatsapp')
    .select('id')
    .eq('motorista_id', motoristaId)
    .maybeSingle()
  return data?.id ?? null
}

export async function registrarMensagemConversa(
  supabase: SupabaseClient,
  input: {
    instanciaId: string | null
    passageiroId: string | null
    confirmacaoId: string | null
    conteudo: string
    direcao: 'entrada' | 'saida'
    tipo: 'resposta_confirmacao' | 'resposta_invalida'
    statusEnvio: 'entregue' | 'enviada' | 'falha'
    whatsappMessageId?: string | null
  },
): Promise<void> {
  await supabase.from('mensagens').insert({
    instancia_whatsapp_id: input.instanciaId,
    passageiro_id: input.passageiroId,
    confirmacao_id: input.confirmacaoId,
    conteudo: input.conteudo,
    direcao: input.direcao,
    tipo: input.tipo,
    status_envio: input.statusEnvio,
    whatsapp_message_id: input.whatsappMessageId ?? null,
    resposta_recebida_em:
      input.direcao === 'entrada' ? new Date().toISOString() : null,
  })
}

export async function registrarNotificacaoResposta(
  supabase: SupabaseClient,
  input: {
    motoristaId: string | null | undefined
    passageiroNome: string
    tipo: TipoConfirmacao
    alterada?: boolean
  },
): Promise<void> {
  if (!input.motoristaId) return
  const acao = input.alterada
    ? 'alterou a resposta'
    : input.tipo === 'nao_vai'
      ? 'recusou presença'
      : 'confirmou presença'

  try {
    await supabase.from('notificacoes').insert({
      motorista_id: input.motoristaId,
      titulo: input.alterada ? 'Resposta alterada' : 'Resposta recebida',
      mensagem: `${input.passageiroNome} ${acao}`,
      tipo: 'whatsapp_resposta',
    })
  } catch (e) {
    console.error('Falha ao registrar notificacao whatsapp_resposta', e)
  }
}
