import { canUseCookieCategory } from './cookieConsent';

export const cacheKeys = {
  motorista: (userId: string) => `sr_motorista_${userId}`,
  rotas: (motoristaId: string) => `sr_rotas_${motoristaId}`,
} as const;

export function readJsonCache<T>(key: string): T | null {
  if (!canUseCookieCategory('preferences')) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJsonCache(key: string, value: unknown): void {
  if (!canUseCookieCategory('preferences')) {
    try { localStorage.removeItem(key); } catch { /* ok */ }
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignora falhas de quota/storage indisponivel.
  }
}
