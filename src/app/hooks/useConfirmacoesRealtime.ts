import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ConfirmacaoRow, PassageiroRow } from '../types/database';

export interface ConfirmacaoComPassageiro extends ConfirmacaoRow {
  passageiros?: Pick<PassageiroRow, 'id' | 'nome_completo' | 'telefone_responsavel' | 'ordem_na_rota'> | null;
}

/**
 * Escuta as confirmações de uma viagem em tempo real.
 * - Faz select inicial joinado com passageiros
 * - Inscreve canal postgres_changes filtrado por viagem_id
 * - Atualiza o estado in-place em INSERT/UPDATE
 * - Limpa o canal no unmount
 *
 * Passe viagemId = null para desativar.
 */
export function useConfirmacoesRealtime(viagemId: string | null) {
  const [confirmacoes, setConfirmacoes] = useState<ConfirmacaoComPassageiro[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!viagemId) {
      setConfirmacoes([]);
      return;
    }
    let ativo = true;
    setLoading(true);

    supabase
      .from('confirmacoes')
      .select('*, passageiros(id, nome_completo, telefone_responsavel, ordem_na_rota)')
      .eq('viagem_id', viagemId)
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) {
          console.error('useConfirmacoesRealtime[select inicial]:', error);
          setConfirmacoes([]);
        } else {
          setConfirmacoes((data ?? []) as ConfirmacaoComPassageiro[]);
        }
        setLoading(false);
      });

    const channel = supabase
      .channel(`confirmacoes_viagem_${viagemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'confirmacoes',
          filter: `viagem_id=eq.${viagemId}`,
        },
        (payload) => {
          setConfirmacoes((prev) => {
            if (payload.eventType === 'INSERT') {
              const novo = payload.new as ConfirmacaoComPassageiro;
              if (prev.some(c => c.id === novo.id)) return prev;
              return [...prev, novo];
            }
            if (payload.eventType === 'UPDATE') {
              const atualizado = payload.new as ConfirmacaoComPassageiro;
              return prev.map(c => c.id === atualizado.id ? { ...c, ...atualizado } : c);
            }
            if (payload.eventType === 'DELETE') {
              const removido = payload.old as { id: string };
              return prev.filter(c => c.id !== removido.id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      ativo = false;
      supabase.removeChannel(channel);
    };
  }, [viagemId]);

  return { confirmacoes, loading };
}
