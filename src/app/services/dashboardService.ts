import { recentUpdates as MOCK_UPDATES } from '../data/mockData';
import { listarRotasComContagem } from './rotaService';
import type { WhatsAppUpdate, RouteConfig } from '../types';

// Feed de respostas recentes — ainda mockado.
// TODO: ler de `mensagens` (direcao = 'entrada', últimas N) quando ativarmos.
export function getRecentUpdates(): WhatsAppUpdate[] {
  return MOCK_UPDATES;
}

export async function getRouteConfigs(): Promise<RouteConfig[]> {
  return listarRotasComContagem();
}
