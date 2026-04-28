import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  iniciarViagem as svcIniciarViagem,
  finalizarViagem as svcFinalizarViagem,
  reenviarConfirmacao as svcReenviarConfirmacao,
  type IniciarViagemResultado,
  type FinalizarViagemResultado,
  type ReenviarConfirmacaoResultado,
} from '../services/viagemService';

function mensagemDeErro(e: unknown, fallback: string): string {
  if (e && typeof e === 'object') {
    const r = e as { erro?: string; message?: string };
    return r.erro ?? r.message ?? fallback;
  }
  return fallback;
}

export function useIniciarViagem() {
  const [loading, setLoading] = useState(false);
  const executar = useCallback(async (rotaId: string): Promise<IniciarViagemResultado | null> => {
    setLoading(true);
    try {
      const r = await svcIniciarViagem(rotaId);
      if (r.ja_existia) {
        toast.info('Viagem do dia já estava em andamento.');
      } else {
        toast.success(`Viagem iniciada — ${r.mensagens_enviadas}/${r.total_passageiros} mensagens enviadas`);
      }
      return r;
    } catch (e) {
      toast.error(mensagemDeErro(e, 'Não foi possível iniciar a viagem'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  return { iniciarViagem: executar, loading };
}

export function useFinalizarViagem() {
  const [loading, setLoading] = useState(false);
  const executar = useCallback(async (viagemId: string): Promise<FinalizarViagemResultado | null> => {
    setLoading(true);
    try {
      const r = await svcFinalizarViagem(viagemId);
      toast.success(`Viagem finalizada · ${r.ausentes_marcados} marcados como ausentes`);
      return r;
    } catch (e) {
      toast.error(mensagemDeErro(e, 'Não foi possível finalizar a viagem'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  return { finalizarViagem: executar, loading };
}

export function useReenviarConfirmacao() {
  const [loading, setLoading] = useState(false);
  const executar = useCallback(async (confirmacaoId: string): Promise<ReenviarConfirmacaoResultado | null> => {
    setLoading(true);
    try {
      const r = await svcReenviarConfirmacao(confirmacaoId);
      toast.success(`Mensagem reenviada (tentativa ${r.tentativa})`);
      return r;
    } catch (e) {
      toast.error(mensagemDeErro(e, 'Não foi possível reenviar'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  return { reenviarConfirmacao: executar, loading };
}
