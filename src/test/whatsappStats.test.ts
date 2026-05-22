import { describe, expect, it } from 'vitest';
import { normalizarEstatisticasMensagens } from '../app/utils/whatsappStats';

describe('normalizarEstatisticasMensagens', () => {
  it('conta mensagens entregues tambem como enviadas', () => {
    const stats = normalizarEstatisticasMensagens({
      total: 53,
      enviadas: 0,
      entregues: 32,
      recebidas: 21,
      falhas: 0,
    });

    expect(stats).toMatchObject({
      enviadas: 32,
      entregues: 32,
      recebidas: 21,
      falhas: 0,
    });
  });

  it('soma mensagens ainda enviadas com mensagens ja entregues', () => {
    const stats = normalizarEstatisticasMensagens({
      enviadas: 8,
      entregues: 24,
      falhas: 2,
      recebidas: 10,
    });

    expect(stats.enviadas).toBe(32);
    expect(stats.entregues).toBe(24);
  });

  it('mantem fallback de entregues quando nao ha recibo de entrega', () => {
    const stats = normalizarEstatisticasMensagens({
      enviadas: 40,
      entregues: 0,
      falhas: 4,
      recebidas: 19,
    });

    expect(stats.enviadas).toBe(40);
    expect(stats.entregues).toBe(36);
  });
});
