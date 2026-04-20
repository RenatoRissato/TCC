import { useCallback, useMemo, useState } from 'react';
import { getPassengers, getSummary } from '../services/passengerService';

const SEED = getPassengers();
import type { Passenger, RouteType, StudentStatus } from '../types';

export type PassengerFilter = 'all' | StudentStatus;
export type PassengerPeriod = 'all' | RouteType;

export interface PassengerFormValues {
  name: string;
  parentName: string;
  address: string;
  neighborhood: string;
  phone: string;
  grade: string;
  routes: RouteType[];
}

interface UsePassengersOptions {
  search?: string;
  filter?: PassengerFilter;
  period?: PassengerPeriod;
}

const STATUS_ORDER: Record<StudentStatus, number> = { going: 0, pending: 1, absent: 2 };

function initials(name: string) {
  return name.trim().split(' ').filter(Boolean).map(n => n[0].toUpperCase()).slice(0, 2).join('');
}

let _nextId = SEED.length + 1;
const nextId = () => ++_nextId;

export function usePassengers({ search = '', filter = 'all', period = 'all' }: UsePassengersOptions = {}) {
  const [list, setList] = useState<Passenger[]>(() => SEED.map(p => ({ ...p })));

  const counts = useMemo(() => ({
    all: list.length,
    going: list.filter(p => p.status === 'going').length,
    absent: list.filter(p => p.status === 'absent').length,
    pending: list.filter(p => p.status === 'pending').length,
  }), [list]);

  const filtered = useMemo(() => {
    let l = [...list];
    if (period !== 'all') l = l.filter(p => p.routes.includes(period));
    if (filter !== 'all') l = l.filter(p => p.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      l = l.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.parentName.toLowerCase().includes(q),
      );
    }
    return l.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }, [list, search, filter, period]);

  const periodSummary = useMemo(
    () => getSummary(period === 'all' ? list : list.filter(p => p.routes.includes(period))),
    [list, period],
  );

  const add = useCallback((form: PassengerFormValues) => {
    setList(prev => [...prev, {
      id: nextId(),
      name: form.name,
      initials: initials(form.name),
      address: form.address,
      neighborhood: form.neighborhood,
      phone: form.phone,
      parentName: form.parentName,
      status: 'pending',
      stopOrder: prev.length + 1,
      routes: form.routes,
      grade: form.grade,
    }]);
  }, []);

  const edit = useCallback((id: number, form: PassengerFormValues) => {
    setList(prev => prev.map(p =>
      p.id === id
        ? { ...p, ...form, initials: initials(form.name) }
        : p,
    ));
  }, []);

  const remove = useCallback((id: number) => {
    setList(prev => prev.filter(p => p.id !== id));
  }, []);

  return { list, filtered, counts, periodSummary, add, edit, remove };
}
