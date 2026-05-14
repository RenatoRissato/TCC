import { supabase } from '../../lib/supabase';
import type { PassageiroRow, ConfirmacaoRow, RotaRow, ObservacoesPassageiro, TipoPassageiro } from '../types/database';
import type { Passenger, RouteType, StudentStatus, Summary } from '../types';
import { formatarEnderecoCompleto } from '../utils/maps';
import { obterRota } from './rotaService';

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

function tipoFromConfirmacao(c?: ConfirmacaoRow): Passenger['tipoConfirmacao'] {
  if (!c) return null;
  if (c.status === 'confirmado' && c.tipo_confirmacao) {
    return c.tipo_confirmacao as Passenger['tipoConfirmacao'];
  }
  if (c.status === 'ausente') return 'nao_vai';
  return null;
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
    confirmacaoId:  confirmacao?.id ?? null,
    tipoConfirmacao: tipoFromConfirmacao(confirmacao),
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
  const detalhado = {
    ida_e_volta: 0,
    somente_ida: 0,
    somente_volta: 0,
    nao_vai: 0,
    pendente: 0,
  };
  const summary: Summary = {
    going: 0, absent: 0, pending: 0, total: list.length, detalhado,
  };
  for (const p of list) {
    if (p.status === 'going') {
      summary.going++;
      // Sem tipo conhecido (fallback raro: row de confirmação antiga sem
      // o campo), conta como ida_e_volta — comportamento mais inclusivo.
      const tipo = p.tipoConfirmacao ?? 'ida_e_volta';
      if (tipo === 'somente_ida') detalhado.somente_ida++;
      else if (tipo === 'somente_volta') detalhado.somente_volta++;
      else detalhado.ida_e_volta++;
    } else if (p.status === 'absent') {
      summary.absent++;
      detalhado.nao_vai++;
    } else {
      summary.pending++;
      detalhado.pendente++;
    }
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
 *
 * IMPORTANTE: se já existe viagem para o dia, passageiros que responderam
 * "Não vai" (confirmado + nao_vai) OU foram marcados ausentes pelo cron
 * são EXCLUÍDOS do trajeto. Não faz sentido o motorista passar na casa de
 * quem já avisou que não vai usar a van.
 *
 * Se NÃO há viagem do dia ainda, retorna todos os ativos (cenário "ainda
 * vou iniciar a rota" — sem confirmações o trajeto é o nominal).
 */
export async function listarPassageirosDaRota(rotaId: string): Promise<string[]> {
  const hoje = new Date().toISOString().slice(0, 10);

  // 1) Busca viagem do dia (se houver) para filtrar quem disse "não vai"
  const { data: viagem } = await supabase
    .from('viagens')
    .select('id')
    .eq('rota_id', rotaId)
    .eq('data', hoje)
    .maybeSingle();

  // 2) Coleta IDs de passageiros que NÃO devem entrar no trajeto. Conta como
  //    "não vai" tanto status='ausente' quanto status='confirmado' + 'nao_vai'.
  const idsExcluir = new Set<string>();
  if (viagem?.id) {
    const { data: confs } = await supabase
      .from('confirmacoes')
      .select('passageiro_id, status, tipo_confirmacao')
      .eq('viagem_id', viagem.id);
    for (const c of confs ?? []) {
      const status = (c as { status: string }).status;
      const tipo = (c as { tipo_confirmacao: string | null }).tipo_confirmacao;
      const naoVaiHoje =
        status === 'ausente' || (status === 'confirmado' && tipo === 'nao_vai');
      if (naoVaiHoje) {
        idsExcluir.add((c as { passageiro_id: string }).passageiro_id);
      }
    }
  }

  // 3) Busca passageiros ATIVOS da rota
  const { data, error } = await supabase
    .from('passageiros')
    .select('id, embarque_rua, embarque_numero, embarque_bairro, embarque_cep, ordem_na_rota')
    .eq('rota_id', rotaId)
    .eq('status', 'ativo')
    .order('ordem_na_rota', { ascending: true });
  if (error) {
    console.error('listarPassageirosDaRota:', error);
    return [];
  }

  // 4) Filtra os que não vão e mapeia para endereço formatado
  return (data ?? [])
    .filter((p) => !idsExcluir.has((p as { id: string }).id))
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

export interface OtimizacaoPassageirosResultado {
  status: 'otimizada' | 'sem_alteracao';
  total: number;
  ordemAntes: string[];
  ordemDepois: string[];
  provedor: 'google' | 'osm';
}

interface EdgeFnError {
  erro: string;
  codigo?: string;
  detalhes?: unknown;
}

async function extrairErro(error: unknown, fallback = 'Erro inesperado'): Promise<EdgeFnError> {
  if (error && typeof error === 'object') {
    const e = error as { erro?: string; codigo?: string; detalhes?: unknown };
    if (e.erro) {
      return { erro: e.erro, codigo: e.codigo, detalhes: e.detalhes };
    }
    const ctx = (error as {
      context?: { json?: () => Promise<EdgeFnError>; text?: () => Promise<string> };
    }).context;
    if (ctx) {
      try {
        if (typeof ctx.json === 'function') {
          const payload = await ctx.json();
          if (payload?.erro) return payload;
        }
      } catch {
        // Se não houver JSON legível, tenta texto logo abaixo.
      }
      try {
        if (typeof ctx.text === 'function') {
          const texto = await ctx.text();
          if (texto.trim()) return { erro: texto.trim() };
        }
      } catch {
        // Cai para a mensagem genérica do objeto de erro.
      }
    }
    const msg = (error as { message?: string }).message;
    if (msg) return { erro: msg };
  }
  return { erro: fallback };
}

function traduzirErroOtimizarSequencia(error: EdgeFnError): EdgeFnError {
  if (error.codigo === 'SEM_PASSAGEIROS_PARA_OTIMIZAR') {
    return {
      ...error,
      erro: 'Esta rota ainda não tem passageiros para serem otimizados.',
    };
  }
  if (error.codigo === 'PASSAGEIROS_INSUFICIENTES_PARA_OTIMIZAR') {
    return {
      ...error,
      erro: 'É preciso ter pelo menos 2 passageiros com endereço completo para otimizar esta rota.',
    };
  }
  if (error.erro.trim() === 'Failed to fetch') {
    return {
      erro: 'Não foi possível conectar à função de otimização no Supabase. Recarregue a página e tente novamente.',
      codigo: error.codigo,
      detalhes: error.detalhes,
    };
  }
  return error;
}

interface PassageiroAtivoDaRota {
  id: string;
  nome_completo: string;
  ordem_na_rota: number;
  endereco: string;
}

interface Coordenada {
  lat: number;
  lon: number;
}

interface NominatimSearchItem {
  lat: string;
  lon: string;
}

interface OsrmTripWaypoint {
  waypoint_index: number;
}

interface OsrmTripResponse {
  code?: string;
  waypoints?: OsrmTripWaypoint[];
}

async function buscarPassageirosAtivosDaRota(rotaId: string): Promise<PassageiroAtivoDaRota[]> {
  const { data, error } = await supabase
    .from('passageiros')
    .select('id, nome_completo, embarque_rua, embarque_numero, embarque_bairro, embarque_cep, ordem_na_rota')
    .eq('rota_id', rotaId)
    .eq('status', 'ativo')
    .order('ordem_na_rota', { ascending: true });

  if (error) {
    throw new Error(`Não foi possível carregar os passageiros da rota: ${error.message}`);
  }

  return (data ?? [])
    .map((p: {
      id: string;
      nome_completo: string;
      embarque_rua: string | null;
      embarque_numero: string | null;
      embarque_bairro: string | null;
      embarque_cep: string | null;
      ordem_na_rota: number;
    }) => ({
      id: p.id,
      nome_completo: p.nome_completo,
      ordem_na_rota: p.ordem_na_rota,
      endereco: formatarEnderecoCompleto({
        rua: p.embarque_rua,
        numero: p.embarque_numero,
        bairro: p.embarque_bairro,
        cep: p.embarque_cep,
      }).trim(),
    }))
    .filter((p) => p.endereco.length > 0);
}

function reordenarPassageirosPorIndices<T>(lista: T[], indices: number[]): T[] {
  if (lista.length !== indices.length) {
    throw new Error('A quantidade de índices otimizados não confere com a lista de passageiros.');
  }

  const vistos = new Set<number>();
  return indices.map((idx) => {
    if (!Number.isInteger(idx) || idx < 0 || idx >= lista.length) {
      throw new Error('A otimização retornou um índice de passageiro inválido.');
    }
    if (vistos.has(idx)) {
      throw new Error('A otimização retornou índices duplicados para os passageiros.');
    }
    vistos.add(idx);
    return lista[idx];
  });
}

function extrairIndicesOtimizadosDoOsrm(
  waypoints: Array<{ waypoint_index: number }>,
  totalPassageiros: number,
): number[] {
  if (waypoints.length !== totalPassageiros + 2) {
    throw new Error('A otimização OSRM retornou uma quantidade inesperada de waypoints.');
  }

  return waypoints
    .slice(1, totalPassageiros + 1)
    .map((waypoint, idxOriginal) => {
      if (!Number.isInteger(waypoint.waypoint_index)) {
        throw new Error('A otimização OSRM retornou waypoint_index inválido.');
      }
      return {
        idxOriginal,
        waypointIndex: waypoint.waypoint_index,
      };
    })
    .sort((a, b) => a.waypointIndex - b.waypointIndex)
    .map((item) => item.idxOriginal);
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function normalizarTextoEndereco(endereco: string): string {
  return endereco
    .replace(/\bRod\.\b/gi, 'Rodovia')
    .replace(/\bDep\.\b/gi, 'Deputado')
    .replace(/\bAv\.\b/gi, 'Avenida')
    .replace(/\bR\.\b/gi, 'Rua')
    .replace(/\s+/g, ' ')
    .trim();
}

function gerarConsultasEndereco(endereco: string): string[] {
  const normalizado = normalizarTextoEndereco(endereco);
  const partes = normalizado.split(',').map((p) => p.trim()).filter(Boolean);
  const [rua, numero, bairro, cep] = partes;

  const candidatos = [
    normalizado,
    `${normalizado}, Brasil`,
    [rua, numero, bairro, cep].filter(Boolean).join(', '),
    [rua, numero, bairro].filter(Boolean).join(', '),
    [rua, numero, cep].filter(Boolean).join(', '),
    [rua, numero].filter(Boolean).join(', '),
    [bairro, cep].filter(Boolean).join(', '),
    cep ?? '',
    cep ? `${cep}, Brasil` : '',
  ];

  return [...new Set(candidatos.map((c) => c.trim()).filter(Boolean))];
}

async function geocodificarEnderecoOpenStreetMap(
  endereco: string,
  cache: Map<string, Coordenada>,
  controle: { ultimaConsultaEm: number },
): Promise<Coordenada> {
  const normalizado = endereco.trim();
  const cached = cache.get(normalizado);
  if (cached) return cached;

  const intervaloMinimoMs = 1100;
  const decorrido = Date.now() - controle.ultimaConsultaEm;
  if (decorrido < intervaloMinimoMs) {
    await esperar(intervaloMinimoMs - decorrido);
  }

  let ultimoErro: Error | null = null;
  for (const consulta of gerarConsultasEndereco(normalizado)) {
    const params = new URLSearchParams({
      q: consulta,
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'br',
      addressdetails: '0',
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
      },
    });
    controle.ultimaConsultaEm = Date.now();

    if (!response.ok) {
      const body = await response.text();
      ultimoErro = new Error(`Nominatim respondeu ${response.status}: ${body}`);
      continue;
    }

    const data = (await response.json()) as NominatimSearchItem[];
    const match = data[0];
    if (!match) continue;

    const lat = Number(match.lat);
    const lon = Number(match.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      ultimoErro = new Error(`O OpenStreetMap retornou coordenadas inválidas para "${consulta}".`);
      continue;
    }

    const coordenada = { lat, lon };
    cache.set(normalizado, coordenada);
    return coordenada;
  }

  if (ultimoErro) throw ultimoErro;
  throw new Error(`Não foi possível localizar o endereço "${normalizado}" no OpenStreetMap.`);
}

async function solicitarOrdemOtimizadaOSRM(params: {
  origem: string;
  destinoFinal: string;
  passageiros: PassageiroAtivoDaRota[];
}): Promise<number[]> {
  const cache = new Map<string, Coordenada>();
  const controle = { ultimaConsultaEm: 0 };

  const coordenadas: Coordenada[] = [];
  coordenadas.push(await geocodificarEnderecoOpenStreetMap(params.origem, cache, controle));
  for (const passageiro of params.passageiros) {
    coordenadas.push(await geocodificarEnderecoOpenStreetMap(passageiro.endereco, cache, controle));
  }
  coordenadas.push(await geocodificarEnderecoOpenStreetMap(params.destinoFinal, cache, controle));

  const coordenadasParam = coordenadas
    .map((coord) => `${coord.lon},${coord.lat}`)
    .join(';');

  const url = new URL(`https://router.project-osrm.org/trip/v1/driving/${coordenadasParam}`);
  url.searchParams.set('source', 'first');
  url.searchParams.set('destination', 'last');
  url.searchParams.set('roundtrip', 'false');
  url.searchParams.set('steps', 'false');
  url.searchParams.set('overview', 'false');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OSRM respondeu ${response.status}: ${body}`);
  }

  const data = (await response.json()) as OsrmTripResponse;
  if (data.code !== 'Ok' || !data.waypoints) {
    throw new Error(`OSRM não conseguiu otimizar a rota (${data.code ?? 'erro desconhecido'}).`);
  }

  return extrairIndicesOtimizadosDoOsrm(data.waypoints, params.passageiros.length);
}

async function otimizarSequenciaPassageirosLocalmente(params: {
  rotaId: string;
  destinoIndex?: number;
}): Promise<OtimizacaoPassageirosResultado> {
  const rota = await obterRota(params.rotaId);
  if (!rota) {
    throw new Error('Rota não encontrada.');
  }

  const origem = formatarEnderecoCompleto({
    rua: rota.ponto_saida_rua,
    numero: rota.ponto_saida_numero,
    bairro: rota.ponto_saida_bairro,
    cep: rota.ponto_saida_cep,
  }).trim();

  const destinos = (rota.destinos ?? [])
    .map((d) => formatarEnderecoCompleto({
      rua: d.rua,
      numero: d.numero,
      bairro: d.bairro,
      cep: d.cep,
    }).trim())
    .filter(Boolean);

  if (!origem) {
    throw new Error('Configure o ponto de saída antes de otimizar a sequência.');
  }
  if (destinos.length === 0) {
    throw new Error('Adicione ao menos um destino final antes de otimizar a sequência.');
  }

  const destinoIndex = params.destinoIndex ?? 0;
  if (destinoIndex >= destinos.length) {
    throw new Error('Destino final inválido para a otimização da rota.');
  }

  const passageiros = await buscarPassageirosAtivosDaRota(params.rotaId);
  const ordemAntes = passageiros.map((p) => p.nome_completo);

  if (passageiros.length < 2) {
    return {
      status: 'sem_alteracao',
      total: passageiros.length,
      ordemAntes,
      ordemDepois: ordemAntes,
      provedor: 'osm',
    };
  }

  const indicesOtimizados = await solicitarOrdemOtimizadaOSRM({
    origem,
    destinoFinal: destinos[destinoIndex],
    passageiros,
  });

  const reordenados = reordenarPassageirosPorIndices(passageiros, indicesOtimizados);
  const ordemDepois = reordenados.map((p) => p.nome_completo);
  const mudou = ordemAntes.some((nome, i) => nome !== ordemDepois[i]);

  if (!mudou) {
    return {
      status: 'sem_alteracao',
      total: passageiros.length,
      ordemAntes,
      ordemDepois,
      provedor: 'osm',
    };
  }

  const updates = reordenados.map((p, index) =>
    supabase
      .from('passageiros')
      .update({ ordem_na_rota: index + 1 })
      .eq('id', p.id),
  );

  const resultados = await Promise.all(updates);
  const erro = resultados.find((r) => r.error)?.error;
  if (erro) {
    throw new Error(`Não foi possível salvar a nova ordem da rota: ${erro.message}`);
  }

  return {
    status: 'otimizada',
    total: passageiros.length,
    ordemAntes,
    ordemDepois,
    provedor: 'osm',
  };
}

export async function otimizarSequenciaPassageirosDaRota(params: {
  rotaId: string;
  destinoIndex?: number;
}): Promise<OtimizacaoPassageirosResultado> {
  const body: { rota_id: string; destino_index?: number } = { rota_id: params.rotaId };
  if (params.destinoIndex !== undefined) {
    body.destino_index = params.destinoIndex;
  }

  const { data, error } = await supabase.functions.invoke<OtimizacaoPassageirosResultado>(
    'otimizar-sequencia-passageiros',
    { body },
  );
  const erroDetalhado = error
    ? await extrairErro(error, 'Falha ao otimizar sequência dos passageiros.')
    : null;
  if (erroDetalhado) {
    throw traduzirErroOtimizarSequencia(erroDetalhado);
  }
  if (!data) {
    throw {
      erro: 'A função de otimização respondeu vazia. Tente novamente em alguns instantes.',
      codigo: 'EDGE_FUNCTION_EMPTY_RESPONSE',
    } as EdgeFnError;
  }
  if (error) {
    throw traduzirErroOtimizarSequencia(
      extrairErro(error, 'Falha ao otimizar sequência dos passageiros.'),
    );
  }
  if (!data) {
    throw {
      erro: 'A função de otimização respondeu vazia. Tente novamente em alguns instantes.',
      codigo: 'EDGE_FUNCTION_EMPTY_RESPONSE',
    } as EdgeFnError;
  }
  if (error) {
    const erroServidor = extrairErro(error, 'Falha ao otimizar sequência dos passageiros');
    console.warn('Fallback local da otimização após falha da Edge Function:', erroServidor);
    return otimizarSequenciaPassageirosLocalmente(params);
  }
  if (!data) {
    console.warn('Fallback local da otimização após resposta vazia da Edge Function.');
    return otimizarSequenciaPassageirosLocalmente(params);
  }
  return data;
}
