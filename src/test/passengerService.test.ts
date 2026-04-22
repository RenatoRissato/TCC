import { describe, it, expect } from 'vitest';
import { getPassengers, getSummary } from '../app/services/passengerService';

describe('passengerService', () => {
  it('retorna lista com 12 passageiros', () => {
    expect(getPassengers()).toHaveLength(12);
  });

  it('getSummary soma corretamente going + absent + pending = total', () => {
    const list = getPassengers();
    const s = getSummary(list);
    expect(s.going + s.absent + s.pending).toBe(s.total);
    expect(s.total).toBe(list.length);
  });

  it('getSummary com lista vazia retorna zeros', () => {
    const s = getSummary([]);
    expect(s).toEqual({ going: 0, absent: 0, pending: 0, total: 0 });
  });
});
