export const COOKIE_CONSENT_KEY = 'smartroute-cookie-consent-v1';
export const COOKIE_POLICY_VERSION = '2026-05-21';
export const COOKIE_CONSENT_CHANGE_EVENT = 'smartroute-cookie-consent-change';
export const COOKIE_PREFERENCES_EVENT = 'smartroute-cookie-preferences-open';

export type CookieConsentCategory = 'necessary' | 'preferences' | 'analytics' | 'marketing';

export interface CookieConsentPreferences {
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface CookieConsentRecord extends CookieConsentPreferences {
  policyVersion: string;
  decidedAt: string;
}

const DEFAULT_PREFERENCES: CookieConsentPreferences = {
  necessary: true,
  preferences: false,
  analytics: false,
  marketing: false,
};

function notifyConsentChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGE_EVENT));
}

function clearNonEssentialStorage(record: CookieConsentRecord): void {
  if (typeof window === 'undefined') return;

  if (!record.preferences) {
    try {
      localStorage.removeItem('theme');
      localStorage.removeItem('debug:whatsapp');
      Object.keys(localStorage)
        .filter((key) => key.startsWith('sr_rotas_'))
        .forEach((key) => localStorage.removeItem(key));
    } catch {
      // Storage indisponivel ou bloqueado pelo navegador.
    }
  }
}

export function getCookieConsent(): CookieConsentRecord | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CookieConsentRecord>;
    return {
      necessary: true,
      preferences: Boolean(parsed.preferences),
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      policyVersion: parsed.policyVersion || COOKIE_POLICY_VERSION,
      decidedAt: parsed.decidedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function getDefaultCookiePreferences(): CookieConsentPreferences {
  return { ...DEFAULT_PREFERENCES };
}

export function saveCookieConsent(
  preferences: Partial<Omit<CookieConsentPreferences, 'necessary'>>,
): CookieConsentRecord {
  const record: CookieConsentRecord = {
    necessary: true,
    preferences: Boolean(preferences.preferences),
    analytics: Boolean(preferences.analytics),
    marketing: Boolean(preferences.marketing),
    policyVersion: COOKIE_POLICY_VERSION,
    decidedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));
      clearNonEssentialStorage(record);
      notifyConsentChanged();
    } catch {
      // Sem acesso ao storage, mantemos a decisao apenas em memoria no caller.
    }
  }

  return record;
}

export function canUseCookieCategory(category: CookieConsentCategory): boolean {
  if (category === 'necessary') return true;
  const consent = getCookieConsent();
  return Boolean(consent?.[category]);
}

export function openCookiePreferences(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(COOKIE_PREFERENCES_EVENT));
}
