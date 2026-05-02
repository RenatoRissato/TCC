export const cacheKeys = {
  motorista: (userId: string) => `sr_motorista_${userId}`,
  rotas: (motoristaId: string) => `sr_rotas_${motoristaId}`,
  passageiros: (motoristaId: string) => `sr_passageiros_${motoristaId}`,
} as const;

export function readJsonCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJsonCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignora falhas de quota/storage indisponivel.
  }
}
