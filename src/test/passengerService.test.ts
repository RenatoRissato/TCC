import { describe, it, expect } from 'vitest';
import { calcularSummary } from '../app/services/passageiroService';
import type { Passenger } from '../app/types';

function p(status: Passenger['status']): Passenger {
  return {
    id: 'x', rotaId: 'r', name: 'X', initials: 'X',
    address: '', addressRua: '', addressNumero: '', addressBairro: '', addressCep: '',
    phone: '', parentName: '',
    tipoPassageiro: 'escola', instituicao: '', serieSemestre: '', curso: '',
    status, stopOrder: 1, routes: ['morning'], grade: '',
  };
}

describe('passageiroService.calcularSummary', () => {
  it('soma going + absent + pending = total', () => {
    const list: Passenger[] = [p('going'), p('going'), p('absent'), p('pending')];
    const s = calcularSummary(list);
    expect(s.going + s.absent + s.pending).toBe(s.total);
    expect(s.total).toBe(list.length);
    expect(s).toEqual({ going: 2, absent: 1, pending: 1, total: 4 });
  });

  it('lista vazia retorna zeros', () => {
    expect(calcularSummary([])).toEqual({ going: 0, absent: 0, pending: 0, total: 0 });
  });
});
