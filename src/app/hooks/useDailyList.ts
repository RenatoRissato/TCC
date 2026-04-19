import { useMemo } from 'react';
import { passengers as SEED, getSummary } from '../data/mockData';
import type { Passenger, RouteType, Summary } from '../types';

interface UseDailyListOptions {
  list?: Passenger[];
  period?: RouteType | 'all';
}

export function useDailyList({ list = SEED, period = 'all' }: UseDailyListOptions = {}) {
  const scoped = useMemo(
    () => (period === 'all' ? list : list.filter(p => p.routes.includes(period))),
    [list, period],
  );

  const summary: Summary = useMemo(() => getSummary(scoped), [scoped]);

  const pending = useMemo(
    () => scoped.filter(p => p.status === 'pending'),
    [scoped],
  );

  const going = useMemo(
    () => scoped.filter(p => p.status === 'going'),
    [scoped],
  );

  const absent = useMemo(
    () => scoped.filter(p => p.status === 'absent'),
    [scoped],
  );

  return { scoped, summary, pending, going, absent };
}
