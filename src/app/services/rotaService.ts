import { supabase } from '../../lib/supabase';
import type { RotaRow, TurnoRota, DestinoRota } from '../types/database';
import type { RouteConfig, RouteType } from '../types';
import { formatarEnderecoCompleto } from '../utils/maps';

const ROUTE_META: Record<RouteType, { emoji: string; color: string; darkBg: boolean }> = {
  morning:   { emoji: '☀️',  color: '#FFC107', darkBg: false },
  afternoon: { emoji: '🌤️', color: '#FD7E14', darkBg: false },
  night:     { emoji: '🌙',  color: '#6C5CE7', darkBg: true  },
};

export async function listarRotas(): Promise<RotaRow[]> {
  const { data, error } = await supabase
    .from('rotas')
    .select('*')
    .eq('status', 'ativa')
    .order('horario_saida', { ascending: true });
  if (error) {
    console.error('listarRotas:', error);
    return [];
  }
  return (data ?? []) as RotaRow[];
}

export interface CriarRotasPadraoResult {
  status: 'ja_existiam' | 'criadas' | 'erro';
  totalCriadas?: number;
  erro?: string;
}

/**
 * Cria as 3 rotas padrão (Manhã / Tarde / Noite) para um motorista recém-criado.
 * Idempotente: se já existem rotas vinculadas a esse motorista, apenas retorna.
 *
 * Retorna estado explícito (em vez de void) para facilitar diagnóstico — o
 * caller pode logar o resultado e detectar bloqueio de RLS, constraint, etc.
 */
export async function criarRotasPadrao(motoristaId: string): Promise<CriarRotasPadraoResult> {
  const padroes = [
    { motorista_id: motoristaId, nome: 'Rota Manhã', horario_saida: '07:00', turno: 'morning'   as const, status: 'ativa' as const },
    { motorista_id: motoristaId, nome: 'Rota Tarde', horario_saida: '12:00', turno: 'afternoon' as const, status: 'ativa' as const },
    { motorista_id: motoristaId, nome: 'Rota Noite', horario_saida: '17:30', turno: 'night'     as const, status: 'ativa' as const },
  ];

  const { data: existentes, error: lookupErr } = await supabase
    .from('rotas')
    .select('nome')
    .eq('motorista_id', motoristaId)
    .in('nome', padroes.map((p) => p.nome));
  if (lookupErr) {
    console.error('criarRotasPadrao (lookup):', lookupErr);
    return { status: 'erro', erro: lookupErr.message };
  }

  const nomesExistentes = new Set((existentes ?? []).map((rota) => rota.nome));
  const faltantes = padroes.filter((rota) => !nomesExistentes.has(rota.nome));
  if (faltantes.length === 0) {
    return { status: 'ja_existiam', totalCriadas: 0 };
  }

  const { data: inseridas, error: insertErr } = await supabase
    .from('rotas')
    .insert(faltantes)
    .select('id');
  if (insertErr) {
    console.error('criarRotasPadrao (insert):', insertErr);
    return { status: 'erro', erro: insertErr.message };
  }

  const totalCriadas = inseridas?.length ?? 0;
  return totalCriadas > 0
    ? { status: 'criadas', totalCriadas }
    : { status: 'ja_existiam', totalCriadas: 0 };
}

export async function listarRotasComContagem(): Promise<RouteConfig[]> {
  const rotas = await listarRotas();
  if (rotas.length === 0) return [];

  const ids = rotas.map(r => r.id);
  const { data: passageiros } = await supabase
    .from('passageiros')
    .select('rota_id')
    .in('rota_id', ids)
    .eq('status', 'ativo');

  const contagem = new Map<string, number>();
  (passageiros ?? []).forEach((p: { rota_id: string }) => {
    contagem.set(p.rota_id, (contagem.get(p.rota_id) ?? 0) + 1);
  });

  return rotas.map(r => {
    const meta = ROUTE_META[r.turno];
    const pontoSaida = formatarEnderecoCompleto({
      rua: r.ponto_saida_rua,
      numero: r.ponto_saida_numero,
      bairro: r.ponto_saida_bairro,
      cep: r.ponto_saida_cep,
    });
    const destinos = Array.isArray(r.destinos) ? r.destinos : [];
    const temDestinoFinal = destinos.some(
      (d) => d && ((d.rua && d.rua.trim()) || (d.rotulo && d.rotulo.trim())),
    );
    return {
      type: r.turno,
      rotaId: r.id,
      label: r.nome,
      time: (r.horario_saida ?? '').slice(0, 5) || '--:--',
      emoji: meta.emoji,
      color: meta.color,
      darkBg: meta.darkBg,
      passengerCount: contagem.get(r.id) ?? 0,
      pontoSaida: pontoSaida || null,
      temDestinoFinal,
    };
  });
}

export interface CriarRotaInput {
  motoristaId: string;
  nome: string;
  turno: TurnoRota;
  horarioSaida?: string | null;
  pontoSaidaRua?: string | null;
  pontoSaidaNumero?: string | null;
  pontoSaidaBairro?: string | null;
  pontoSaidaCep?: string | null;
  destinos?: DestinoRota[];
}

export async function criarRota(input: CriarRotaInput): Promise<RotaRow | null> {
  const { data, error } = await supabase
    .from('rotas')
    .insert({
      motorista_id: input.motoristaId,
      nome: input.nome,
      turno: input.turno,
      horario_saida: input.horarioSaida ?? null,
      ponto_saida_rua: input.pontoSaidaRua ?? null,
      ponto_saida_numero: input.pontoSaidaNumero ?? null,
      ponto_saida_bairro: input.pontoSaidaBairro ?? null,
      ponto_saida_cep: input.pontoSaidaCep ?? null,
      destinos: input.destinos ?? [],
      status: 'ativa',
    })
    .select()
    .single();
  if (error) {
    console.error('criarRota:', error);
    return null;
  }
  return data as RotaRow;
}

export interface AtualizarRotaInput {
  nome?: string;
  turno?: TurnoRota;
  horarioSaida?: string | null;
  pontoSaidaRua?: string | null;
  pontoSaidaNumero?: string | null;
  pontoSaidaBairro?: string | null;
  pontoSaidaCep?: string | null;
  destinos?: DestinoRota[];
}

export async function atualizarRota(id: string, input: AtualizarRotaInput): Promise<boolean> {
  const patch: Record<string, unknown> = {};
  if (input.nome !== undefined)             patch.nome = input.nome;
  if (input.turno !== undefined)            patch.turno = input.turno;
  if (input.horarioSaida !== undefined)     patch.horario_saida = input.horarioSaida;
  if (input.pontoSaidaRua !== undefined)    patch.ponto_saida_rua = input.pontoSaidaRua;
  if (input.pontoSaidaNumero !== undefined) patch.ponto_saida_numero = input.pontoSaidaNumero;
  if (input.pontoSaidaBairro !== undefined) patch.ponto_saida_bairro = input.pontoSaidaBairro;
  if (input.pontoSaidaCep !== undefined)    patch.ponto_saida_cep = input.pontoSaidaCep;
  if (input.destinos !== undefined)         patch.destinos = input.destinos;

  const { error } = await supabase.from('rotas').update(patch).eq('id', id);
  if (error) {
    console.error('atualizarRota:', error);
    return false;
  }
  return true;
}

/**
 * Soft delete — preserva histórico de viagens e passageiros.
 * Para "apagar de verdade", o admin do banco precisa intervir.
 */
export async function apagarRota(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('rotas')
    .update({ status: 'inativa' })
    .eq('id', id);
  if (error) {
    console.error('apagarRota:', error);
    return false;
  }
  return true;
}

export async function obterRota(id: string): Promise<RotaRow | null> {
  const { data, error } = await supabase
    .from('rotas')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('obterRota:', error);
    return null;
  }
  return data as RotaRow | null;
}

export interface ValidacaoRota {
  valido: boolean;
  erro?: string;
  /**
   * Código curto da falha — permite que a UI customize o tom da mensagem
   * (ex: 'todos_nao_vao' merece um info/aviso, não um erro vermelho).
   */
  codigo?:
    | 'rota_nao_encontrada'
    | 'sem_ponto_saida'
    | 'sem_destino'
    | 'sem_passageiros'
    | 'todos_nao_vao'
    | 'erro_consulta';
}

/**
 * Valida se a rota está pronta para iniciar uma viagem.
 * Verifica em ordem: ponto de saída, destino final, passageiros ativos,
 * e — se já houver viagem do dia — se ainda sobra alguém que vai embarcar.
 * Retorna na primeira falha — o motorista corrige um problema por vez.
 */
export async function validarRotaParaInicio(rotaId: string): Promise<ValidacaoRota> {
  const rota = await obterRota(rotaId);
  if (!rota) {
    return { valido: false, erro: 'Rota não encontrada.', codigo: 'rota_nao_encontrada' };
  }

  // 1) Ponto de saída — pelo menos rua precisa estar preenchida
  const temPontoSaida = !!(rota.ponto_saida_rua && rota.ponto_saida_rua.trim());
  if (!temPontoSaida) {
    return {
      valido: false,
      codigo: 'sem_ponto_saida',
      erro: "Configure o ponto de saída da van antes de iniciar. Clique em 'Gerenciar Rotas' para editar.",
    };
  }

  // 2) Pelo menos um destino final cadastrado
  const destinos = Array.isArray(rota.destinos) ? rota.destinos : [];
  const temDestino = destinos.some(d => d && (d.rua?.trim() || d.rotulo?.trim()));
  if (!temDestino) {
    return {
      valido: false,
      codigo: 'sem_destino',
      erro: "Adicione pelo menos um destino final na rota. Clique em 'Gerenciar Rotas' para editar.",
    };
  }

  // 3) Pelo menos um passageiro ativo
  const { data: paxAtivos, error: paxErr } = await supabase
    .from('passageiros')
    .select('id')
    .eq('rota_id', rotaId)
    .eq('status', 'ativo');
  if (paxErr) {
    console.error('validarRotaParaInicio[passageiros]:', paxErr);
    return { valido: false, erro: 'Não foi possível validar a rota. Tente novamente.', codigo: 'erro_consulta' };
  }
  const ids = (paxAtivos ?? []).map(p => p.id);
  if (ids.length === 0) {
    return {
      valido: false,
      codigo: 'sem_passageiros',
      erro: 'Nenhum passageiro cadastrado nesta rota. Adicione passageiros antes de iniciar a viagem.',
    };
  }

  // 4) Se já existe viagem do dia, verifica se ainda sobra ALGUÉM que vai
  //    embarcar. Caso todos os passageiros tenham respondido "Não vai" ou
  //    estejam ausentes, não faz sentido sair: o motorista perderia o tempo
  //    rodando pra ninguém. Mostramos um aviso amigável e abortamos antes
  //    de abrir o Google Maps.
  const hoje = new Date().toISOString().slice(0, 10);
  const { data: viagem } = await supabase
    .from('viagens')
    .select('id')
    .eq('rota_id', rotaId)
    .eq('data', hoje)
    .maybeSingle();

  if (viagem?.id) {
    const { data: confs, error: confsErr } = await supabase
      .from('confirmacoes')
      .select('passageiro_id, status, tipo_confirmacao')
      .eq('viagem_id', viagem.id)
      .in('passageiro_id', ids);
    if (confsErr) {
      console.error('validarRotaParaInicio[confirmacoes]:', confsErr);
      return { valido: false, erro: 'Não foi possível validar a rota. Tente novamente.', codigo: 'erro_consulta' };
    }

    // Só rola "todos não vão" quando temos confirmação de TODOS os ativos
    // (uma por passageiro) e nenhuma delas indica que o aluno vai.
    if ((confs ?? []).length === ids.length && confs!.length > 0) {
      const todosRecusaram = confs!.every((c) => {
        const status = (c as { status: string }).status;
        const tipo = (c as { tipo_confirmacao: string | null }).tipo_confirmacao;
        return (
          status === 'ausente' ||
          (status === 'confirmado' && tipo === 'nao_vai')
        );
      });
      if (todosRecusaram) {
        return {
          valido: false,
          codigo: 'todos_nao_vao',
          erro: 'Todos os alunos desta rota responderam que NÃO vão hoje (opção 4). Não há motivo para iniciar a viagem.',
        };
      }
    }
  }

  return { valido: true };
}
