import { supabase } from '../../lib/supabase';
import type { RotaRow } from '../types/database';
import type { RouteConfig, RouteType } from '../types';

export function inferirRouteType(nome: string): RouteType {
  const n = nome.toLowerCase();
  if (n.includes('tarde') || n.includes('afternoon')) return 'afternoon';
  if (n.includes('noite') || n.includes('night')) return 'night';
  return 'morning';
}

const ROUTE_META: Record<RouteType, { emoji: string; color: string; darkBg: boolean; defaultLabel: string }> = {
  morning:   { emoji: '☀️',  color: '#FFC107', darkBg: false, defaultLabel: 'Rota Manhã' },
  afternoon: { emoji: '🌤️', color: '#FD7E14', darkBg: false, defaultLabel: 'Rota Tarde' },
  night:     { emoji: '🌙',  color: '#6C5CE7', darkBg: true,  defaultLabel: 'Rota Noite' },
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
    const type = inferirRouteType(r.nome);
    const meta = ROUTE_META[type];
    return {
      type,
      rotaId: r.id,
      label: r.nome,
      time: (r.horario_saida ?? '').slice(0, 5) || '--:--',
      emoji: meta.emoji,
      color: meta.color,
      darkBg: meta.darkBg,
      passengerCount: contagem.get(r.id) ?? 0,
    };
  });
}
