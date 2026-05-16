import { supabase } from '../../lib/supabase';
import type { StatusUIDetalhado } from '../utils/confirmacaoStatus';

// ─────────────────────────────────────────────────────────────────────────
// Helpers de data (fuso de Brasília)
// ─────────────────────────────────────────────────────────────────────────
const TZ = 'America/Sao_Paulo';

/** Data atual em ISO (YYYY-MM-DD) no fuso de Brasília. */
export function dataBrasilISO(date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function addDias(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function primeiroDiaMes(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-01`;
}

function ultimoDiaMes(ano: number, mes: number): string {
  // Dia 0 do mês N+1 = último dia do mês N.
  const dt = new Date(Date.UTC(ano, mes, 0));
  return dt.toISOString().slice(0, 10);
}

const NOMES_MES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const ABREV_DIA_SEMANA: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
};

function diaSemanaAbrev(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return ABREV_DIA_SEMANA[dt.getUTCDay()];
}

// ─────────────────────────────────────────────────────────────────────────
// Tipos exportados
// ─────────────────────────────────────────────────────────────────────────

export interface ConfirmacoesDetalhadas {
  ida_e_volta: number;
  somente_ida: number;
  somente_volta: number;
  nao_vai: number;
  pendente: number;
}

export interface EstatisticasHoje {
  going: number;          // soma das 3 categorias de "vai"
  absent: number;         // nao_vai
  pending: number;        // pendente
  total: number;
  detalhado: ConfirmacoesDetalhadas;
}

export interface DiaSemana {
  /** 'Seg', 'Ter', ... */
  rotulo: string;
  /** 'YYYY-MM-DD' */
  data: string;
  going: number;
  absent: number;
  pending: number;
  total: number;
}

export interface TaxaMensal {
  ano: number;
  mes: number;               // 1..12
  rotuloMes: string;         // 'Março 2026'
  presencaPct: number;       // 0..100 (compareceram / total respostas)
  totalRespostas: number;    // confirmadas + ausentes
  totalCompareceram: number; // confirmadas com tipo ≠ nao_vai
  /** Delta em pontos percentuais vs mês anterior (pode ser negativo). */
  deltaPctVsMesAnterior: number | null;
}

export interface EstatisticaRota {
  rotaId: string;
  nome: string;
  going: number;
  absent: number;
  pending: number;
  total: number;
}

export interface EstatisticasMensagensSemana {
  enviadas: number;
  entregues: number;
  falhas: number;
  recebidas: number;
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────

/** IDs de todas as rotas do motorista (independente de status). Cache local
 *  faz sentido aqui mas começamos sem — a query é leve (1 índice). */
async function obterRotaIdsDoMotorista(motoristaId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('rotas')
    .select('id')
    .eq('motorista_id', motoristaId);
  if (error) {
    console.error('estatisticas/obterRotaIdsDoMotorista:', error);
    return [];
  }
  return (data ?? []).map((r: { id: string }) => r.id);
}

interface ViagemLite { id: string; data: string; rota_id: string }

async function obterViagensIntervalo(
  motoristaId: string,
  dataInicio: string,
  dataFim: string,
): Promise<ViagemLite[]> {
  const rotaIds = await obterRotaIdsDoMotorista(motoristaId);
  if (rotaIds.length === 0) return [];
  const { data, error } = await supabase
    .from('viagens')
    .select('id, data, rota_id')
    .in('rota_id', rotaIds)
    .gte('data', dataInicio)
    .lte('data', dataFim);
  if (error) {
    console.error('estatisticas/obterViagensIntervalo:', error);
    return [];
  }
  return (data ?? []) as ViagemLite[];
}

function classificar(
  status: string | null | undefined,
  tipo: string | null | undefined,
): StatusUIDetalhado {
  if (status === 'pendente' || status == null) return 'pendente';
  if (status === 'ausente') return 'nao_vai';
  if (status === 'confirmado') {
    if (tipo === 'nao_vai') return 'nao_vai';
    if (tipo === 'somente_ida') return 'somente_ida';
    if (tipo === 'somente_volta') return 'somente_volta';
    return 'ida_e_volta';
  }
  return 'pendente';
}

function detalhadoVazio(): ConfirmacoesDetalhadas {
  return { ida_e_volta: 0, somente_ida: 0, somente_volta: 0, nao_vai: 0, pendente: 0 };
}

function agregarDetalhado(detalhado: ConfirmacoesDetalhadas) {
  const going = detalhado.ida_e_volta + detalhado.somente_ida + detalhado.somente_volta;
  return { going, absent: detalhado.nao_vai, pending: detalhado.pendente };
}

// ─────────────────────────────────────────────────────────────────────────
// 1) Status de hoje
// ─────────────────────────────────────────────────────────────────────────
export async function getEstatisticasHoje(motoristaId: string): Promise<EstatisticasHoje> {
  const hoje = dataBrasilISO();
  const viagens = await obterViagensIntervalo(motoristaId, hoje, hoje);
  if (viagens.length === 0) {
    return { going: 0, absent: 0, pending: 0, total: 0, detalhado: detalhadoVazio() };
  }
  const viagemIds = viagens.map((v) => v.id);
  const { data, error } = await supabase
    .from('confirmacoes')
    .select('status, tipo_confirmacao')
    .in('viagem_id', viagemIds);
  if (error) {
    console.error('estatisticas/getEstatisticasHoje:', error);
    return { going: 0, absent: 0, pending: 0, total: 0, detalhado: detalhadoVazio() };
  }
  const detalhado = detalhadoVazio();
  for (const c of data ?? []) {
    const cls = classificar((c as { status: string }).status, (c as { tipo_confirmacao: string | null }).tipo_confirmacao);
    detalhado[cls]++;
  }
  const { going, absent, pending } = agregarDetalhado(detalhado);
  return { going, absent, pending, total: (data ?? []).length, detalhado };
}

// ─────────────────────────────────────────────────────────────────────────
// 2) Confirmações dos últimos 7 dias
// ─────────────────────────────────────────────────────────────────────────
export async function getConfirmacoesSemana(motoristaId: string): Promise<DiaSemana[]> {
  const hoje = dataBrasilISO();
  const inicio = addDias(hoje, -6); // janela inclusiva de 7 dias até hoje

  const viagens = await obterViagensIntervalo(motoristaId, inicio, hoje);
  // Pré-popula buckets com zero para todos os 7 dias — mesmo dias sem
  // viagem aparecem no gráfico (barras a zero).
  const buckets: Record<string, DiaSemana> = {};
  for (let i = 0; i < 7; i++) {
    const d = addDias(inicio, i);
    buckets[d] = {
      data: d, rotulo: diaSemanaAbrev(d),
      going: 0, absent: 0, pending: 0, total: 0,
    };
  }

  if (viagens.length === 0) return Object.values(buckets);

  const viagemPorId = new Map(viagens.map((v) => [v.id, v.data]));
  const viagemIds = viagens.map((v) => v.id);

  const { data, error } = await supabase
    .from('confirmacoes')
    .select('viagem_id, status, tipo_confirmacao')
    .in('viagem_id', viagemIds);
  if (error) {
    console.error('estatisticas/getConfirmacoesSemana:', error);
    return Object.values(buckets);
  }

  for (const c of data ?? []) {
    const viagemId = (c as { viagem_id: string }).viagem_id;
    const dataDia = viagemPorId.get(viagemId);
    if (!dataDia) continue;
    const bucket = buckets[dataDia];
    if (!bucket) continue;
    const cls = classificar(
      (c as { status: string }).status,
      (c as { tipo_confirmacao: string | null }).tipo_confirmacao,
    );
    if (cls === 'pendente') bucket.pending++;
    else if (cls === 'nao_vai') bucket.absent++;
    else bucket.going++;
    bucket.total++;
  }

  return Object.values(buckets);
}

// ─────────────────────────────────────────────────────────────────────────
// 3) Taxa de presença mensal + delta vs mês anterior
// ─────────────────────────────────────────────────────────────────────────

async function calcularTaxaDoMes(
  motoristaId: string, ano: number, mes: number,
): Promise<{ presencaPct: number; totalRespostas: number; totalCompareceram: number }> {
  const inicio = primeiroDiaMes(ano, mes);
  const fim = ultimoDiaMes(ano, mes);
  const viagens = await obterViagensIntervalo(motoristaId, inicio, fim);
  if (viagens.length === 0) {
    return { presencaPct: 0, totalRespostas: 0, totalCompareceram: 0 };
  }
  const viagemIds = viagens.map((v) => v.id);
  const { data, error } = await supabase
    .from('confirmacoes')
    .select('status, tipo_confirmacao')
    .in('viagem_id', viagemIds);
  if (error) {
    console.error('estatisticas/calcularTaxaDoMes:', error);
    return { presencaPct: 0, totalRespostas: 0, totalCompareceram: 0 };
  }
  let totalRespostas = 0;
  let totalCompareceram = 0;
  for (const c of data ?? []) {
    const cls = classificar(
      (c as { status: string }).status,
      (c as { tipo_confirmacao: string | null }).tipo_confirmacao,
    );
    if (cls === 'pendente') continue; // só conta quem respondeu
    totalRespostas++;
    if (cls !== 'nao_vai') totalCompareceram++;
  }
  const presencaPct = totalRespostas > 0
    ? Math.round((totalCompareceram / totalRespostas) * 100)
    : 0;
  return { presencaPct, totalRespostas, totalCompareceram };
}

export async function getTaxaMensal(motoristaId: string): Promise<TaxaMensal> {
  const hojeIso = dataBrasilISO();
  const [anoStr, mesStr] = hojeIso.split('-');
  const ano = Number(anoStr);
  const mes = Number(mesStr);

  const atual = await calcularTaxaDoMes(motoristaId, ano, mes);

  const mesAnt = mes === 1 ? 12 : mes - 1;
  const anoAnt = mes === 1 ? ano - 1 : ano;
  const anterior = await calcularTaxaDoMes(motoristaId, anoAnt, mesAnt);

  const delta: number | null = anterior.totalRespostas === 0
    ? null
    : atual.presencaPct - anterior.presencaPct;

  return {
    ano, mes,
    rotuloMes: `${NOMES_MES_PT[mes - 1]} ${ano}`,
    presencaPct: atual.presencaPct,
    totalRespostas: atual.totalRespostas,
    totalCompareceram: atual.totalCompareceram,
    deltaPctVsMesAnterior: delta,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 4) Distribuição por rota (status hoje)
// ─────────────────────────────────────────────────────────────────────────
export async function getEstatisticasPorRota(motoristaId: string): Promise<EstatisticaRota[]> {
  const hoje = dataBrasilISO();
  const { data: rotas, error: rotasErr } = await supabase
    .from('rotas')
    .select('id, nome')
    .eq('motorista_id', motoristaId)
    .eq('status', 'ativa');
  if (rotasErr || !rotas) {
    console.error('estatisticas/getEstatisticasPorRota[rotas]:', rotasErr);
    return [];
  }
  if (rotas.length === 0) return [];
  const rotaIds = rotas.map((r: { id: string }) => r.id);

  const { data: viagens } = await supabase
    .from('viagens')
    .select('id, rota_id')
    .in('rota_id', rotaIds)
    .eq('data', hoje);
  const viagemRota = new Map<string, string>(
    (viagens ?? []).map((v: { id: string; rota_id: string }) => [v.id, v.rota_id]),
  );
  const viagemIds = Array.from(viagemRota.keys());

  // Inicializa stats por rota — rotas sem viagem hoje aparecem zeradas
  const stats = new Map<string, EstatisticaRota>();
  for (const r of rotas) {
    stats.set(r.id, {
      rotaId: r.id, nome: (r as { nome: string }).nome,
      going: 0, absent: 0, pending: 0, total: 0,
    });
  }

  if (viagemIds.length === 0) return Array.from(stats.values());

  const { data: confs } = await supabase
    .from('confirmacoes')
    .select('viagem_id, status, tipo_confirmacao')
    .in('viagem_id', viagemIds);

  for (const c of confs ?? []) {
    const rotaId = viagemRota.get((c as { viagem_id: string }).viagem_id);
    if (!rotaId) continue;
    const stat = stats.get(rotaId);
    if (!stat) continue;
    const cls = classificar(
      (c as { status: string }).status,
      (c as { tipo_confirmacao: string | null }).tipo_confirmacao,
    );
    if (cls === 'pendente') stat.pending++;
    else if (cls === 'nao_vai') stat.absent++;
    else stat.going++;
    stat.total++;
  }

  return Array.from(stats.values());
}

// ─────────────────────────────────────────────────────────────────────────
// 5) Mensagens WhatsApp dos últimos 7 dias
// ─────────────────────────────────────────────────────────────────────────
export async function getEstatisticasMensagensSemana(
  motoristaId: string,
): Promise<EstatisticasMensagensSemana> {
  // Descobre a instância do motorista (pode não ter — retorna zeros).
  const { data: inst } = await supabase
    .from('instancias_whatsapp')
    .select('id')
    .eq('motorista_id', motoristaId)
    .maybeSingle();
  const instanciaId: string | null = (inst as { id?: string } | null)?.id ?? null;
  if (!instanciaId) {
    return { enviadas: 0, entregues: 0, falhas: 0, recebidas: 0, total: 0 };
  }

  const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const base = () =>
    supabase
      .from('mensagens')
      .select('*', { count: 'exact', head: true })
      .eq('instancia_whatsapp_id', instanciaId)
      .gte('enviada_em', desde);

  const [
    { count: total },
    { count: enviadas },
    { count: entregues },
    { count: falhas },
    { count: recebidas },
  ] = await Promise.all([
    base(),
    base().eq('direcao', 'saida').eq('status_envio', 'enviada'),
    base().eq('direcao', 'saida').eq('status_envio', 'entregue'),
    base().eq('direcao', 'saida').eq('status_envio', 'falha'),
    base().eq('direcao', 'entrada'),
  ]);

  return {
    total: total ?? 0,
    enviadas: enviadas ?? 0,
    entregues: entregues ?? 0,
    falhas: falhas ?? 0,
    recebidas: recebidas ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Bundle: tudo numa única chamada paralela
// ─────────────────────────────────────────────────────────────────────────
export interface EstatisticasCompletas {
  hoje: EstatisticasHoje;
  semana: DiaSemana[];
  mensal: TaxaMensal;
  porRota: EstatisticaRota[];
  mensagensSemana: EstatisticasMensagensSemana;
}

export async function getEstatisticasCompletas(motoristaId: string): Promise<EstatisticasCompletas> {
  const [hoje, semana, mensal, porRota, mensagensSemana] = await Promise.all([
    getEstatisticasHoje(motoristaId),
    getConfirmacoesSemana(motoristaId),
    getTaxaMensal(motoristaId),
    getEstatisticasPorRota(motoristaId),
    getEstatisticasMensagensSemana(motoristaId),
  ]);
  return { hoje, semana, mensal, porRota, mensagensSemana };
}
