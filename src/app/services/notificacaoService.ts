import { supabase } from '../../lib/supabase';
import type { NotificacaoRow } from '../types/database';

export async function listarNotificacoes(
  motoristaId: string,
  limit = 50,
): Promise<NotificacaoRow[]> {
  const { data, error } = await supabase
    .from('notificacoes')
    .select('*')
    .eq('motorista_id', motoristaId)
    .order('criada_em', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('listarNotificacoes:', error);
    return [];
  }
  return (data ?? []) as NotificacaoRow[];
}

export async function contarNaoLidas(motoristaId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notificacoes')
    .select('id', { count: 'exact', head: true })
    .eq('motorista_id', motoristaId)
    .eq('lida', false);
  if (error) {
    console.error('contarNaoLidas:', error);
    return 0;
  }
  return count ?? 0;
}

export async function marcarComoLida(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('id', id);
  if (error) {
    console.error('marcarComoLida:', error);
    return false;
  }
  return true;
}

export async function marcarTodasComoLidas(motoristaId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('motorista_id', motoristaId)
    .eq('lida', false);
  if (error) {
    console.error('marcarTodasComoLidas:', error);
    return false;
  }
  return true;
}
