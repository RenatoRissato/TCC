import { useEffect, useMemo, useState } from 'react';
import { listarPassageiros, calcularSummary } from '../services/passageiroService';
import type { Passenger, RouteType, Summary } from '../types';

interface UseDailyListOptions {
  list?: Passenger[];
  period?: RouteType | 'all';
}

export function useDailyList({ list, period = 'all' }: UseDailyListOptions = {}) {
  const [internal, setInternal] = useState<Passenger[]>(list ?? []);

  useEffect(() => {
    if (list) {
      setInternal(list);
      return;
    }
    let ativo = true;
    listarPassageiros().then(dados => {
      if (ativo) setInternal(dados);
    });
    return () => { ativo = false; };
  }, [list]);

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
