import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { enviarMensagem as svcEnviarMensagem, type EnviarMensagemResultado } from '../services/mensagemService';

function mensagemDeErro(e: unknown, fallback: string): string {
  if (e && typeof e === 'object') {
    const r = e as { erro?: string; message?: string };
    return r.erro ?? r.message ?? fallback;
  }
  return fallback;
}

export function useEnviarMensagem() {
  const [loading, setLoading] = useState(false);
  const executar = useCallback(async (passageiroId: string, mensagem: string): Promise<EnviarMensagemResultado | null> => {
    setLoading(true);
    try {
      const r = await svcEnviarMensagem(passageiroId, mensagem);
      toast.success(`Mensagem enviada para ${r.passageiro}`);
      return r;
    } catch (e) {
      toast.error(mensagemDeErro(e, 'Não foi possível enviar a mensagem'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  return { enviarMensagem: executar, loading };
}
