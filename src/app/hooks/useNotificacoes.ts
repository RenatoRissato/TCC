import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MessageCircle, Bus, CheckCircle2 } from 'lucide-react';
import { createElement } from 'react';
import { supabase } from '../../lib/supabase';
import type { NotificacaoRow, TipoNotificacao } from '../types/database';
import {
  contarNaoLidas,
  listarNotificacoes,
  marcarComoLida as svcMarcarComoLida,
  marcarTodasComoLidas as svcMarcarTodasComoLidas,
} from '../services/notificacaoService';

function iconePorTipo(tipo: TipoNotificacao) {
  if (tipo === 'whatsapp_resposta') {
    return createElement(MessageCircle, { size: 18, color: '#25D366' });
  }
  if (tipo === 'viagem_iniciada') {
    return createElement(Bus, { size: 18, color: '#FFC107' });
  }
  return createElement(CheckCircle2, { size: 18, color: '#198754' });
}

export function useNotificacoes(motoristaId: string | null) {
  const [lista, setLista] = useState<NotificacaoRow[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(false);

  const recarregar = useCallback(async () => {
    if (!motoristaId) return;
    setLoading(true);
    const [registros, count] = await Promise.all([
      listarNotificacoes(motoristaId),
      contarNaoLidas(motoristaId),
    ]);
    setLista(registros);
    setNaoLidas(count);
    setLoading(false);
  }, [motoristaId]);

  useEffect(() => {
    if (!motoristaId) {
      setLista([]);
      setNaoLidas(0);
      return;
    }
    let ativo = true;
    void (async () => {
      const [registros, count] = await Promise.all([
        listarNotificacoes(motoristaId),
        contarNaoLidas(motoristaId),
      ]);
      if (!ativo) return;
      setLista(registros);
      setNaoLidas(count);
    })();

    const channel = supabase
      .channel(`notificacoes_motorista_${motoristaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `motorista_id=eq.${motoristaId}`,
        },
        (payload) => {
          const nova = payload.new as NotificacaoRow;
          setLista((prev) => (prev.some(n => n.id === nova.id) ? prev : [nova, ...prev]));
          if (!nova.lida) setNaoLidas((n) => n + 1);
          toast(nova.titulo, {
            description: nova.mensagem,
            icon: iconePorTipo(nova.tipo),
            duration: 4000,
          });
        },
      )
      .subscribe();

    return () => {
      ativo = false;
      supabase.removeChannel(channel);
    };
  }, [motoristaId]);

  const marcarComoLida = useCallback(async (id: string) => {
    setLista((prev) => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    setNaoLidas((n) => Math.max(0, n - 1));
    const ok = await svcMarcarComoLida(id);
    if (!ok) await recarregar();
  }, [recarregar]);

  const marcarTodasComoLidas = useCallback(async () => {
    if (!motoristaId) return;
    setLista((prev) => prev.map(n => ({ ...n, lida: true })));
    setNaoLidas(0);
    const ok = await svcMarcarTodasComoLidas(motoristaId);
    if (!ok) await recarregar();
  }, [motoristaId, recarregar]);

  return { lista, naoLidas, loading, recarregar, marcarComoLida, marcarTodasComoLidas };
}
