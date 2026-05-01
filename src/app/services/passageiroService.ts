import { supabase } from '../../lib/supabase';
import type { PassageiroRow, ConfirmacaoRow, RotaRow } from '../types/database';
import type { Passenger, RouteType, StudentStatus, Summary } from '../types';

function iniciais(nome: string): string {
  return nome.trim().split(/\s+/).filter(Boolean).map(p => p[0]?.toUpperCase() ?? '').slice(0, 2).join('');
}

function statusFromConfirmacao(c?: ConfirmacaoRow): StudentStatus {
  if (!c) return 'pending';
  if (c.status === 'confirmado') {
    return c.tipo_confirmacao === 'nao_vai' ? 'absent' : 'going';
  }
  if (c.status === 'ausente') return 'absent';
  return 'pending';
}

function rowToPassenger(
  row: PassageiroRow,
  rota: RotaRow | undefined,
  confirmacao?: ConfirmacaoRow,
): Passenger {
  const routeType: RouteType = rota ? rota.turno : 'morning';
  return {
    id: row.id,
    rotaId: row.rota_id,
    name: row.nome_completo,
    initials: iniciais(row.nome_completo),
    address: row.endereco_embarque,
    neighborhood: row.ponto_referencia ?? '',
    phone: row.telefone_responsavel,
    parentName: row.observacoes ?? '',
    status: statusFromConfirmacao(confirmacao),
    stopOrder: row.ordem_na_rota,
    routes: [routeType],
    grade: row.turno ?? '',
  };
}

export async function listarPassageiros(): Promise<Passenger[]> {
  const { data: rotas, error: erroRotas } = await supabase.from('rotas').select('*');
  if (erroRotas) {
    console.error('listarPassageiros[rotas]:', erroRotas);
    return [];
  }
  const rotasPorId = new Map<string, RotaRow>(
    (rotas ?? []).map((r: RotaRow) => [r.id, r]),
  );

  const { data: passageiros, error } = await supabase
    .from('passageiros')
    .select('*')
    .eq('status', 'ativo')
    .order('ordem_na_rota', { ascending: true });
  if (error) {
    console.error('listarPassageiros[passageiros]:', error);
    return [];
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const { data: viagens } = await supabase
    .from('viagens')
    .select('id')
    .eq('data', hoje);
  const viagensIds = (viagens ?? []).map((v: { id: string }) => v.id);

  let confirmacoesPorPassageiro = new Map<string, ConfirmacaoRow>();
  if (viagensIds.length > 0) {
    const { data: confirmacoes } = await supabase
      .from('confirmacoes')
      .select('*')
      .in('viagem_id', viagensIds);
    (confirmacoes ?? []).forEach((c: ConfirmacaoRow) => {
      confirmacoesPorPassageiro.set(c.passageiro_id, c);
    });
  }

  return (passageiros as PassageiroRow[]).map(p =>
    rowToPassenger(p, rotasPorId.get(p.rota_id), confirmacoesPorPassageiro.get(p.id)),
  );
}

export interface CriarPassageiroInput {
  rotaId: string;
  nomeCompleto: string;
  telefoneResponsavel: string;
  enderecoEmbarque: string;
  pontoReferencia?: string;
  turno?: string;
  ordemNaRota?: number;
  observacoes?: string;
}

export async function criarPassageiro(input: CriarPassageiroInput): Promise<PassageiroRow | null> {
  const { data, error } = await supabase
    .from('passageiros')
    .insert({
      rota_id: input.rotaId,
      nome_completo: input.nomeCompleto,
      telefone_responsavel: input.telefoneResponsavel.replace(/\D/g, ''),
      endereco_embarque: input.enderecoEmbarque,
      ponto_referencia: input.pontoReferencia ?? null,
      turno: input.turno ?? null,
      ordem_na_rota: input.ordemNaRota ?? 1,
      observacoes: input.observacoes ?? null,
    })
    .select()
    .single();
  if (error) {
    console.error('criarPassageiro:', error);
    return null;
  }
  return data as PassageiroRow;
}

export async function atualizarPassageiro(id: string, input: Partial<CriarPassageiroInput>): Promise<boolean> {
  const patch: Record<string, unknown> = {};
  if (input.rotaId !== undefined) patch.rota_id = input.rotaId;
  if (input.nomeCompleto !== undefined) patch.nome_completo = input.nomeCompleto;
  if (input.telefoneResponsavel !== undefined) patch.telefone_responsavel = input.telefoneResponsavel.replace(/\D/g, '');
  if (input.enderecoEmbarque !== undefined) patch.endereco_embarque = input.enderecoEmbarque;
  if (input.pontoReferencia !== undefined) patch.ponto_referencia = input.pontoReferencia;
  if (input.turno !== undefined) patch.turno = input.turno;
  if (input.ordemNaRota !== undefined) patch.ordem_na_rota = input.ordemNaRota;
  if (input.observacoes !== undefined) patch.observacoes = input.observacoes;

  const { error } = await supabase.from('passageiros').update(patch).eq('id', id);
  if (error) {
    console.error('atualizarPassageiro:', error);
    return false;
  }
  return true;
}

export async function inativarPassageiro(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('passageiros')
    .update({ status: 'inativo' })
    .eq('id', id);
  if (error) {
    console.error('inativarPassageiro:', error);
    return false;
  }
  return true;
}

export function calcularSummary(list: Passenger[]): Summary {
  const summary: Summary = { going: 0, absent: 0, pending: 0, total: list.length };
  for (const p of list) {
    if (p.status === 'going') summary.going++;
    else if (p.status === 'absent') summary.absent++;
    else summary.pending++;
  }
  return summary;
}

// Compat com chamadas legadas
export function getSummary(list: Passenger[]): Summary {
  return calcularSummary(list);
}

/**
 * Lista os endereços de embarque dos passageiros ATIVOS de uma rota,
 * ordenados por `ordem_na_rota`. Usado para montar os waypoints do Google Maps.
 */
export async function listarPassageirosDaRota(rotaId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('passageiros')
    .select('endereco_embarque, ordem_na_rota')
    .eq('rota_id', rotaId)
    .eq('status', 'ativo')
    .order('ordem_na_rota', { ascending: true });
  if (error) {
    console.error('listarPassageirosDaRota:', error);
    return [];
  }
  return (data ?? [])
    .map((p: { endereco_embarque: string }) => (p.endereco_embarque ?? '').trim())
    .filter((s): s is string => s.length > 0);
}
