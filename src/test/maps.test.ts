import { describe, it, expect } from 'vitest';
import { deveAbrirMapsNoMesmoContexto, montarUrlGoogleMaps } from '../app/utils/maps';

describe('montarUrlGoogleMaps', () => {
  it('usa o último item como destino e os anteriores como waypoints', () => {
    const url = montarUrlGoogleMaps(
      'R. Natalino Breda, 303 - Anavec, Limeira - SP',
      [
        'R. Alcides Teresa, 78 - Jardim Nova Limeira, Limeira - SP',
        'R. Miguel Guidote, 405 - Parque Egisto Ragazzo, Limeira - SP',
      ],
    );

    expect(url).not.toBeNull();

    const parsed = new URL(url!);
    expect(parsed.searchParams.get('origin')).toBe('R. Natalino Breda, 303 - Anavec, Limeira - SP');
    expect(parsed.searchParams.get('destination')).toBe('R. Miguel Guidote, 405 - Parque Egisto Ragazzo, Limeira - SP');
    expect(parsed.searchParams.get('waypoints')).toBe('R. Alcides Teresa, 78 - Jardim Nova Limeira, Limeira - SP');
  });

  it('nunca injeta o prefixo optimize:true nos waypoints', () => {
    const url = montarUrlGoogleMaps(
      'Origem',
      ['Parada 1', 'Destino'],
    );

    expect(url).not.toBeNull();
    expect(url).not.toContain('optimize:true');
  });

  it('abre no mesmo contexto em user agents mobile', () => {
    expect(deveAbrirMapsNoMesmoContexto('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe(true);
    expect(deveAbrirMapsNoMesmoContexto('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
  });

  it('mantem nova aba em user agents desktop', () => {
    expect(deveAbrirMapsNoMesmoContexto('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
  });
});
