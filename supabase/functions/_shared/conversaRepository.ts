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

export async function buscarPassageiroPorTelefone(
  supabase: SupabaseClient,
  telefone: string,
): Promise<PassageiroConversa | null> {
  const { data, error } = await supabase
    .from('passageiros')
    .select('id, nome_completo, telefone_responsavel, rota_id, rotas(motorista_id)')
    .in('telefone_responsavel', candidatosTelefone(telefone))
    .eq('status', 'ativo')
    .limit(1)

  if (error) throw error
  return (data?.[0] ?? null) as PassageiroConversa | null
}

export async function buscarConfirmacaoDoDia(
  supabase: SupabaseClient,
  passageiroId: string,
  data = dataBrasilISO(),
): Promise<ConfirmacaoConversa | null> {
  const { data: confs, error } = await supabase
    .from('confirmacoes')
    .select(
      'id, status, tipo_confirmacao, viagem_id, passageiro_id, respondida_em, passageiros(id, nome_completo, telefone_responsavel, rota_id, rotas(motorista_id)), viagens!inner(data, rota_id)',
    )
    .eq('passageiro_id', passageiroId)
    .eq('viagens.data', data)
    .order('criada_em', { ascending: false })
    .limit(1)

  if (error) throw error
  return (confs?.[0] ?? null) as ConfirmacaoConversa | null
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
