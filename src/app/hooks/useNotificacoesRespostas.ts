import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { tocarSomAlerta } from '../utils/somAlerta';
import {
  statusUIDetalhadoDaConfirmacao,
} from '../utils/confirmacaoStatus';
import { STATUS_UI_DETALHADO_META } from '../utils/confirmacaoStatusMeta';
import type { SomAlerta } from '../types';

interface Options {
  /** Liga o toast no canto da tela quando o responsável responde. */
  toastAtivo: boolean;
  /** Liga o som ao receber resposta. 'none' equivale a desligado. */
  som: SomAlerta;
}

interface ConfirmacaoPayload {
  id: string;
  viagem_id: string;
  passageiro_id: string;
  status: string;
  tipo_confirmacao: string | null;
  respondida_em: string | null;
}

/**
 * Observa as confirmações do motorista em tempo real e dispara:
 *   - Toast no canto da tela (se `toastAtivo`)
 *   - Beep curto via Web Audio (se `som !== 'none'`)
 *
 * Quando dispara:
 *   - Evento UPDATE em `confirmacoes` cujo `respondida_em` é mais recente que o
 *     momento em que o hook começou a escutar (filtra respostas antigas que o
 *     Postgres possa reentregar) e cuja viagem pertence ao motorista.
 *   - Status precisa ter saído de `pendente` (confirmado ou ausente).
 *
 * Performance:
 *   - Uma subscription única (`postgres_changes` em `confirmacoes`). Não dá
 *     pra filtrar por motorista direto no canal (sem JOIN), então filtramos
 *     em memória usando a lista de viagens do motorista, carregada de tempos
 *     em tempos. Volume de eventos é baixíssimo (1 evento por resposta de
 *     responsável) — overhead é desprezível.
 */
export function useNotificacoesRespostas(
  motoristaId: string | null,
  { toastAtivo, som }: Options,
) {
  // Mantém refs pra ler valores atuais dentro do callback do channel sem
  // recriar a subscription a cada toggle.
  const toastRef = useRef(toastAtivo);
  const somRef = useRef(som);
  useEffect(() => { toastRef.current = toastAtivo; }, [toastAtivo]);
  useEffect(() => { somRef.current = som; }, [som]);

  useEffect(() => {
    if (!motoristaId) return;
    // Se ambos estiverem desligados, nem assina. Economiza socket.
    if (!toastAtivo && (som === 'none')) return;

    let cancelado = false;
    const inicioMs = Date.now();
    // Cache de viagem_id → rota_id pertence ao motorista. Preenchido sob
    // demanda quando um evento chega.
    const viagemPertence = new Map<string, boolean>();

    let rotaIdsMotorista = new Set<string>();
    const carregarRotas = async () => {
      const { data } = await supabase
        .from('rotas')
        .select('id')
        .eq('motorista_id', motoristaId);
      if (cancelado) return;
      rotaIdsMotorista = new Set((data ?? []).map((r: { id: string }) => r.id));
    };
    void carregarRotas();

    async function pertenceAoMotorista(viagemId: string): Promise<boolean> {
      if (viagemPertence.has(viagemId)) return viagemPertence.get(viagemId)!;
      const { data } = await supabase
        .from('viagens')
        .select('rota_id')
        .eq('id', viagemId)
        .maybeSingle();
      const rotaId = (data as { rota_id?: string } | null)?.rota_id ?? null;
      const ok = !!rotaId && rotaIdsMotorista.has(rotaId);
      viagemPertence.set(viagemId, ok);
      return ok;
    }

    const channel = supabase
      .channel(`respostas_motorista_${motoristaId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'confirmacoes' },
        async (payload) => {
          const novo = payload.new as ConfirmacaoPayload;
          if (!novo?.respondida_em) return;
          // Resposta antiga (anterior ao hook ter começado) — ignora.
          if (Date.parse(novo.respondida_em) < inicioMs) return;
          if (novo.status === 'pendente') return;
          // Confirma que pertence ao motorista (algumas instâncias podem
          // receber eventos de outros motoristas se RLS estiver permissivo).
          const ok = await pertenceAoMotorista(novo.viagem_id);
          if (!ok || cancelado) return;

          // Busca nome do passageiro pra montar mensagem amigável
          const { data: pax } = await supabase
            .from('passageiros')
            .select('nome_completo')
            .eq('id', novo.passageiro_id)
            .maybeSingle();
          if (cancelado) return;
          const nome = (pax as { nome_completo?: string } | null)?.nome_completo ?? 'Passageiro';

          const statusUI = statusUIDetalhadoDaConfirmacao(
            novo.status as 'confirmado' | 'ausente' | 'pendente',
            novo.tipo_confirmacao as 'ida_e_volta' | 'somente_ida' | 'somente_volta' | 'nao_vai' | null,
          );
          const meta = STATUS_UI_DETALHADO_META[statusUI];

          if (toastRef.current) {
            toast(`${nome} respondeu`, {
              description: meta.label,
              duration: 5000,
            });
          }
          if (somRef.current !== 'none') {
            tocarSomAlerta(somRef.current);
          }
        },
      )
      .subscribe();

    return () => {
      cancelado = true;
      supabase.removeChannel(channel);
    };
    // Re-assina quando muda motoristaId ou quando alguma feature liga/desliga.
    // som muda dentro do callback via ref — não precisa entrar nas deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motoristaId, toastAtivo, som === 'none']);
}
