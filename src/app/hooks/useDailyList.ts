import { useEffect, useMemo, useState } from 'react';
import { listarPassageiros, calcularSummary } from '../services/passageiroService';
import { useAuth } from '../context/AuthContext';
import type { Passenger, RouteType, Summary } from '../types';

interface UseDailyListOptions {
  list?: Passenger[];
  period?: RouteType | 'all';
}

export function useDailyList({ list, period = 'all' }: UseDailyListOptions = {}) {
  const { motoristaId } = useAuth();
  const [internal, setInternal] = useState<Passenger[]>(list ?? []);

  // Espera motoristaId ficar pronto antes de buscar — em reabertura do app
  // com sessão hidratada, o JWT pode ainda estar em refresh; disparar a
  // query antes da hora trava em loading e retorna vazio (RLS).
  useEffect(() => {
    if (list) {
      setInternal(list);
      return;
    }
    if (!motoristaId) return;
    let ativo = true;
    listarPassageiros().then(dados => {
      if (ativo) setInternal(dados);
    });
    return () => { ativo = false; };
  }, [list, motoristaId]);

  const scoped = useMemo(
    () => (period === 'all' ? internal : internal.filter(p => p.routes.includes(period))),
    [internal, period],
  );

  const summary: Summary = useMemo(() => calcularSummary(scoped), [scoped]);
  const pending = useMemo(() => scoped.filter(p => p.status === 'pending'), [scoped]);
  const going   = useMemo(() => scoped.filter(p => p.status === 'going'), [scoped]);
  const absent  = useMemo(() => scoped.filter(p => p.status === 'absent'), [scoped]);

  return { scoped, summary, pending, going, absent };
}
