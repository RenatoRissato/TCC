import { supabase } from '../../lib/supabase';
import type { PassageiroRow, ConfirmacaoRow, RotaRow, ObservacoesPassageiro, TipoPassageiro } from '../types/database';
import type { Passenger, RouteType, StudentStatus, Summary } from '../types';
import { formatarEnderecoCompleto } from '../utils/maps';

/**
 * Formata a string de "série/curso" exibida no PassengerCard a partir do
 * JSONB. Mantém o card legado funcionando sem alterações.
 *   escola    → "5º Fundamental" / "3º Médio"
 *   faculdade → "Engenharia · 3º Semestre" (curso e/ou semestre, separados por ·)
 */
function formatarGradeParaCard(obs: ObservacoesPassageiro | null): string {
  if (!obs) return '';
  if (obs.tipoPassageiro === 'faculdade') {
    return [obs.curso, obs.serieSemestre].filter(s => s && s.trim()).join(' · ');
  }
  return obs.serieSemestre ?? '';
}

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
  const addressRua    = row.embarque_rua    ?? '';
  const addressNumero = row.embarque_numero ?? '';
  const addressBairro = row.embarque_bairro ?? '';
  const addressCep    = row.embarque_cep    ?? '';
  const address = formatarEnderecoCompleto({
    rua: addressRua, numero: addressNumero, bairro: addressBairro, cep: addressCep,
  });

  // Defensivo: quando a coluna ainda era TEXT, alguns registros podem chegar
  // como string crua se cache antigo do PostgREST estiver no caminho. Tratamos.
  const obsRaw = row.observacoes;
  const obs: ObservacoesPassageiro | null =
    obsRaw && typeof obsRaw === 'object' ? obsRaw : null;

  return {
    id: row.id,
    rotaId: row.rota_id,
    name: row.nome_completo,
    initials: iniciais(row.nome_completo),
    address,
    addressRua,
    addressNumero,
    addressBairro,
    addressCep,
    phone: row.telefone_responsavel,
    // Card mostra parentName quando existe (Fundamental). Para Médio/Faculdade
    // fica vazio — o link do WhatsApp já trata vazio graciosamente.
    parentName: obs?.nomeResponsavel ?? '',
    status: statusFromConfirmacao(confirmacao),
    stopOrder: row.ordem_na_rota,
    routes: [routeType],
    grade: formatarGradeParaCard(obs),
    tipoPassageiro: obs?.tipoPassageiro ?? 'escola',
    instituicao:    obs?.instituicao    ?? '',
    serieSemestre:  obs?.serieSemestre  ?? '',
    curso:          obs?.curso          ?? '',
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
  /**
   * Pode ser do responsável (Fundamental) ou do próprio aluno (Médio/Faculdade).
   * Vai sempre para a coluna telefone_responsavel — a semântica do número é
   * inferida pelo tipoPassageiro + serieSemestre armazenados no JSONB.
   */
  telefoneResponsavel: string;
  embarqueRua: string;
  embarqueNumero?: string;
  embarqueBairro?: string;
  embarqueCep?: string;
  ordemNaRota?: number;
  // Dados acadêmicos (vão para o JSONB observacoes)
  tipoPassageiro: TipoPassageiro;
  instituicao?: string;
  serieSemestre?: string;
  curso?: string;
  nomeResponsavel?: string;
}

/**
 * Monta o objeto JSONB que vai para a coluna observacoes a partir dos
 * campos do input. Omite chaves vazias para manter o JSON limpo.
 */
function montarObservacoes(input: Pick<CriarPassageiroInput,
  'tipoPassageiro' | 'instituicao' | 'serieSemestre' | 'curso' | 'nomeResponsavel'
>): ObservacoesPassageiro | null {
  const obj: ObservacoesPassageiro = { tipoPassageiro: input.tipoPassageiro };
  if (input.instituicao?.trim())     obj.instituicao     = input.instituicao.trim();
  if (input.serieSemestre?.trim())   obj.serieSemestre   = input.serieSemestre.trim();
  if (input.curso?.trim())           obj.curso           = input.curso.trim();
  if (input.nomeResponsavel?.trim()) obj.nomeResponsavel = input.nomeResponsavel.trim();
  return obj;
}

export async function criarPassageiro(input: CriarPassageiroInput): Promise<PassageiroRow | null> {
  const { data, error } = await supabase
    .from('passageiros')
    .insert({
      rota_id: input.rotaId,
      nome_completo: input.nomeCompleto,
      telefone_responsavel: input.telefoneResponsavel.replace(/\D/g, ''),
      embarque_rua:    input.embarqueRua    || null,
      embarque_numero: input.embarqueNumero || null,
      embarque_bairro: input.embarqueBairro || null,
      embarque_cep:    input.embarqueCep    || null,
      turno: null,
      ordem_na_rota: input.ordemNaRota ?? 1,
      observacoes: montarObservacoes(input),
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
  if (input.rotaId !== undefined)              patch.rota_id = input.rotaId;
  if (input.nomeCompleto !== undefined)        patch.nome_completo = input.nomeCompleto;
  if (input.telefoneResponsavel !== undefined) patch.telefone_responsavel = input.telefoneResponsavel.replace(/\D/g, '');
  if (input.ordemNaRota !== undefined)         patch.ordem_na_rota = input.ordemNaRota;

  // Endereço estruturado — atualiza tudo em conjunto para manter consistência
  if (
    input.embarqueRua    !== undefined ||
    input.embarqueNumero !== undefined ||
    input.embarqueBairro !== undefined ||
    input.embarqueCep    !== undefined
  ) {
    patch.embarque_rua    = input.embarqueRua    ?? null;
    patch.embarque_numero = input.embarqueNumero ?? null;
    patch.embarque_bairro = input.embarqueBairro ?? null;
    patch.embarque_cep    = input.embarqueCep    ?? null;
  }

  // Observações JSONB — recompõe inteiro quando qualquer campo acadêmico
  // muda. Evita merge parcial que deixaria o JSONB inconsistente.
  if (
    input.tipoPassageiro  !== undefined ||
    input.instituicao     !== undefined ||
    input.serieSemestre   !== undefined ||
    input.curso           !== undefined ||
    input.nomeResponsavel !== undefined
  ) {
    patch.observacoes = montarObservacoes({
      tipoPassageiro:  input.tipoPassageiro ?? 'escola',
      instituicao:     input.instituicao,
      serieSemestre:   input.serieSemestre,
      curso:           input.curso,
      nomeResponsavel: input.nomeResponsavel,
    });
  }

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
    .delete()
    .eq('id', id);
  if (error) {
    console.error('excluirPassageiro:', error);
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
    .select('embarque_rua, embarque_numero, embarque_bairro, embarque_cep, ordem_na_rota')
    .eq('rota_id', rotaId)
    .eq('status', 'ativo')
    .order('ordem_na_rota', { ascending: true });
  if (error) {
    console.error('listarPassageirosDaRota:', error);
    return [];
  }
  return (data ?? [])
    .map((p: {
      embarque_rua: string | null;
      embarque_numero: string | null;
      embarque_bairro: string | null;
      embarque_cep: string | null;
    }) => formatarEnderecoCompleto({
      rua: p.embarque_rua, numero: p.embarque_numero,
      bairro: p.embarque_bairro, cep: p.embarque_cep,
    }).trim())
    .filter((s): s is string => s.length > 0);
}
