import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Check, Cookie, ExternalLink, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { BottomSheetModal } from '../shared/BottomSheetModal';
import {
  COOKIE_PREFERENCES_EVENT,
  CookieConsentRecord,
  getCookieConsent,
  getDefaultCookiePreferences,
  saveCookieConsent,
} from '../../utils/cookieConsent';

type EditablePreferences = {
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
};

function ToggleLine({
  title,
  description,
  active,
  locked,
  onChange,
}: {
  title: string;
  description: string;
  active: boolean;
  locked?: boolean;
  onChange?: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-app-border bg-field px-4 py-3">
      <div>
        <p className="m-0 text-sm font-extrabold text-ink">{title}</p>
        <p className="m-0 mt-1 text-xs leading-relaxed text-ink-soft">{description}</p>
      </div>
      <button
        type="button"
        disabled={locked}
        onClick={() => onChange?.(!active)}
        className={[
          'relative mt-1 h-7 w-12 shrink-0 rounded-full border-0 transition-colors',
          locked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer',
          active ? 'bg-success' : 'bg-ink-muted/35',
        ].join(' ')}
        aria-pressed={active}
        aria-label={`${title}: ${active ? 'ativo' : 'inativo'}`}
      >
        <span
          className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform"
          style={{ left: 4, transform: active ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<CookieConsentRecord | null>(() => getCookieConsent());
  const [managerOpen, setManagerOpen] = useState(false);
  const [draft, setDraft] = useState<EditablePreferences>(() => {
    const current = getCookieConsent() ?? getDefaultCookiePreferences();
    return {
      preferences: current.preferences,
      analytics: current.analytics,
      marketing: current.marketing,
    };
  });

  useEffect(() => {
    const openManager = () => {
      const current = getCookieConsent() ?? getDefaultCookiePreferences();
      setDraft({
        preferences: current.preferences,
        analytics: current.analytics,
        marketing: current.marketing,
      });
      setManagerOpen(true);
    };

    window.addEventListener(COOKIE_PREFERENCES_EVENT, openManager);
    return () => window.removeEventListener(COOKIE_PREFERENCES_EVENT, openManager);
  }, []);

  const persist = (next: EditablePreferences) => {
    const saved = saveCookieConsent(next);
    setConsent(saved);
    setDraft({
      preferences: saved.preferences,
      analytics: saved.analytics,
      marketing: saved.marketing,
    });
    setManagerOpen(false);
  };

  const acceptAll = () => persist({ preferences: true, analytics: true, marketing: true });
  const rejectNonEssential = () => persist({ preferences: false, analytics: false, marketing: false });
  const showBanner = !consent;

  return (
    <>
      {showBanner && (
        <div className="fixed inset-x-3 bottom-3 z-[180] mx-auto max-w-5xl">
          <div className="rounded-[24px] border border-pending/35 bg-panel p-4 shadow-[0_12px_42px_rgba(0,0,0,0.24)] md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pending/15">
                  <Cookie size={24} className="text-pending" strokeWidth={2.3} />
                </div>
                <div>
                  <p className="m-0 text-base font-black text-ink">Privacidade e cookies</p>
                  <p className="m-0 mt-1 text-xs leading-relaxed text-ink-soft md:text-sm">
                    Usamos armazenamento local para manter sessão, segurança, preferências e melhorar a experiência.
                    Recursos não essenciais, como métricas e marketing, só ficam ativos se você permitir.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-bold">
                    <Link to="/privacy" className="inline-flex items-center gap-1 text-pending no-underline">
                      Política de Privacidade <ExternalLink size={12} />
                    </Link>
                    <Link to="/cookies" className="inline-flex items-center gap-1 text-pending no-underline">
                      Política de Cookies <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:ml-auto">
                <button
                  type="button"
                  onClick={rejectNonEssential}
                  className="min-h-11 rounded-[14px] border-2 border-app-border bg-transparent px-4 text-sm font-extrabold text-ink-soft"
                >
                  Recusar não essenciais
                </button>
                <button
                  type="button"
                  onClick={() => setManagerOpen(true)}
                  className="min-h-11 rounded-[14px] border-2 border-pending/45 bg-pending/10 px-4 text-sm font-extrabold text-ink"
                >
                  Gerenciar preferências
                </button>
                <button
                  type="button"
                  onClick={acceptAll}
                  className="min-h-11 rounded-[14px] border-0 bg-pending px-4 text-sm font-black text-[#212529]"
                >
                  Aceitar todos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomSheetModal
        open={managerOpen}
        onOpenChange={setManagerOpen}
        title="Gerenciar cookies"
        description="Escolha as categorias de cookies e armazenamento local permitidas."
        maxWidth={560}
        forceCenter
        hideHandle
      >
        <div className="flex max-h-[88dvh] flex-col font-sans">
          <div className="border-b border-divider px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/12">
                <ShieldCheck size={24} className="text-success" strokeWidth={2.2} />
              </div>
              <div className="flex-1">
                <p className="m-0 text-lg font-black text-ink">Preferências de privacidade</p>
                <p className="m-0 text-xs leading-relaxed text-ink-soft">
                  Você pode alterar sua escolha depois em Configurações.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-app-border bg-field"
                aria-label="Fechar preferências de cookies"
              >
                <X size={18} className="text-ink-soft" strokeWidth={2.4} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <ToggleLine
              title="Necessários"
              description="Sempre ativos. Mantêm login, sessão, segurança, navegação e funcionamento básico."
              active
              locked
            />
            <ToggleLine
              title="Preferências"
              description="Salvam tema, layout, filtros e ajustes de experiência do motorista."
              active={draft.preferences}
              onChange={(next) => setDraft((prev) => ({ ...prev, preferences: next }))}
            />
            <ToggleLine
              title="Analíticos"
              description="Preparado para métricas de uso e desempenho. Hoje nenhum script analítico é carregado."
              active={draft.analytics}
              onChange={(next) => setDraft((prev) => ({ ...prev, analytics: next }))}
            />
            <ToggleLine
              title="Marketing"
              description="Desativado por padrão. Só deve ser usado se futuramente existir recurso de marketing."
              active={draft.marketing}
              onChange={(next) => setDraft((prev) => ({ ...prev, marketing: next }))}
            />

            <div className="rounded-2xl border border-pending/25 bg-pending/10 px-4 py-3">
              <div className="flex items-start gap-2">
                <SlidersHorizontal size={16} className="mt-0.5 text-pending" strokeWidth={2.4} />
                <p className="m-0 text-xs leading-relaxed text-ink-soft">
                  A decisão salva data/hora e versão da política. Cookies necessários não podem ser desligados porque o app precisa deles para operar.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 border-t border-divider px-5 py-4">
            <button
              type="button"
              onClick={rejectNonEssential}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[14px] border-2 border-app-border bg-transparent text-sm font-bold text-ink-soft"
            >
              <X size={16} strokeWidth={2.4} />
              Recusar
            </button>
            <button
              type="button"
              onClick={() => persist(draft)}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[14px] border-0 bg-pending text-sm font-black text-[#212529]"
            >
              <Check size={16} strokeWidth={2.6} />
              Salvar preferências
            </button>
          </div>
        </div>
      </BottomSheetModal>
    </>
  );
}
