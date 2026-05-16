import { useCallback, useEffect, useState } from 'react';
import {
  getEstatisticasCompletas,
  type EstatisticasCompletas,
} from '../services/estatisticasService';

interface UseEstatisticasOptions {
  /** Quando false, não roda a query (útil pra evitar carregar quando o
   *  accordion está fechado). Default: true. */
  ativo?: boolean;
}

interface UseEstatisticasReturn {
  estatisticas: EstatisticasCompletas | null;
  loading: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
}

/**
 * Carrega todas as estatísticas do motorista em paralelo.
 *
 * `ativo=false` permite manter o hook montado mas sem disparar query —
 * útil quando o pai já sabe que o painel está fechado (accordion).
 * Quando vira true, a query roda automaticamente.
 */
export function useEstatisticas(
  motoristaId: string | null,
  options: UseEstatisticasOptions = {},
): UseEstatisticasReturn {
  const { ativo = true } = options;
  const [estatisticas, setEstatisticas] = useState<EstatisticasCompletas | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (!motoristaId) return;
    setLoading(true);
    setErro(null);
    try {
      const r = await getEstatisticasCompletas(motoristaId);
      setEstatisticas(r);
    } catch (e) {
      console.error('useEstatisticas:', e);
      setErro(e instanceof Error ? e.message : 'Falha ao carregar estatísticas.');
    } finally {
      setLoading(false);
    }
  }, [motoristaId]);

  useEffect(() => {
    if (!ativo || !motoristaId) return;
    void recarregar();
  }, [ativo, motoristaId, recarregar]);

  return { estatisticas, loading, erro, recarregar };
}
