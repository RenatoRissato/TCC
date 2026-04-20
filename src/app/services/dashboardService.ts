import { recentUpdates as MOCK_UPDATES, routeConfigs as MOCK_ROUTES } from '../data/mockData';
import type { WhatsAppUpdate, RouteConfig } from '../types';

// Mock implementation — substituir por chamadas à API real (ex: GET /api/dashboard)

export function getRecentUpdates(): WhatsAppUpdate[] {
  return MOCK_UPDATES;
}

export function getRouteConfigs(): RouteConfig[] {
  return MOCK_ROUTES;
}
