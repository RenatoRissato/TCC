import { supabase } from '../../lib/supabase';
import { listarRotasComContagem } from './rotaService';
import { alunoVaiHoje } from '../utils/confirmacaoStatus';
import type { WhatsAppUpdate, RouteConfig } from '../types';
import type { StatusConfirmacao, TipoConfirmacao } from '../types/database';

interface ConfirmacaoJoin {
  id: string;
  status: StatusConfirmacao;
  tipo_confirmacao: TipoConfirmacao | null;
  respondida_em: string;
  passageiros: { nome_completo: string } | { nome_completo: string }[] | null;
}

function obterIniciais(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatarTempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias}d`;
}

function mensagemPorTipo(tipo: TipoConfirmacao | null, indo: boolean): string {
  if (!indo) return 'Não vai hoje.';
  if (tipo === 'ida_e_volta') return 'Vai — ida e volta.';
  if (tipo === 'somente_ida') return 'Vai — somente ida.';
  if (tipo === 'somente_volta') return 'Vai — somente volta.';
  return 'Confirmou presença.';
}

export async function getRecentUpdates(): Promise<WhatsAppUpdate[]> {
  const { data, error } = await supabase
    .from('confirmacoes')
    .select('id, status, tipo_confirmacao, respondida_em, passageiros!inner(nome_completo)')
    .in('status', ['confirmado', 'ausente'])
    .not('respondida_em', 'is', null)
    .order('respondida_em', { ascending: false })
    .limit(5);

  if (error) {
    console.error('getRecentUpdates:', error);
    return [];
  }

  return (data ?? []).map((c: ConfirmacaoJoin) => {
    const p = Array.isArray(c.passageiros) ? c.passageiros[0] : c.passageiros;
    const nome = p?.nome_completo ?? 'Passageiro';
    // Bug anterior: usava `c.status === 'confirmado'` para inferir que o aluno
    // ia hoje. Mas `confirmado + nao_vai` significa "respondeu dizendo que NÃO
    // vai" — a UI mostrava "Confirmou presença + VAI" pra quem havia recusado.
    // O helper centraliza essa regra.
    const indo = alunoVaiHoje(c.status, c.tipo_confirmacao);
    return {
      id: c.id,
      name: nome,
      initials: obterIniciais(nome),
      status: indo ? 'going' : 'absent',
      message: mensagemPorTipo(c.tipo_confirmacao, indo),
      time: formatarTempoRelativo(c.respondida_em),
    };
  });
}

export async function getRouteConfigs(): Promise<RouteConfig[]> {
  return listarRotasComContagem();
}
