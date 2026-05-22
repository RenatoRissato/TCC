import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Cookie, Menu, SlidersHorizontal } from 'lucide-react';
import { useBreakpoints } from '../hooks/useWindowSize';
import { useNavDrawer } from '../context/NavDrawerContext';
import { openCookiePreferences } from '../utils/cookieConsent';

function CookieSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="sr-card-lift rounded-[22px] border-[1.5px] border-app-border bg-panel p-5 shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.45)]">
      <h2 className="m-0 mb-3 text-base font-black text-ink tracking-tight">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

export function CookiePolicyScreen() {
  const navigate = useNavigate();
  const { isDesktop, isLg, isMd } = useBreakpoints();
  const { openDrawer } = useNavDrawer();
  const px = isDesktop ? 36 : isMd ? 24 : 16;

  return (
    <div className="min-h-full bg-surface transition-colors">
      <header
        className="relative overflow-hidden"
        style={{
          // Padrao consistente — gradient dark + halos amber (cor tematica
          // da pagina de cookies, igual ao botao "Gerenciar cookies" abaixo).
          background: 'linear-gradient(155deg, #0A0D12 0%, #161B22 55%, #1A1F26 100%)',
          padding: `${isDesktop ? 32 : 22}px ${px}px ${isDesktop ? 36 : 30}px`,
        }}
      >
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-[380px] h-[380px] pointer-events-none rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.20) 0%, transparent 65%)' }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-20 -left-20 w-[300px] h-[300px] pointer-events-none rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.08) 0%, transparent 65%)' }}
        />

        <div className="relative flex items-center gap-3">
          {!isLg && (
            <button
              type="button"
              onClick={openDrawer}
              className="sr-press flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-white/10 bg-white/[0.06] transition-colors hover:bg-white/[0.1]"
              aria-label="Abrir menu"
            >
              <Menu size={20} color="rgba(255,255,255,0.85)" strokeWidth={2.2} />
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="sr-press flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-white/10 bg-white/[0.06] transition-colors hover:bg-white/[0.1]"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} color="rgba(255,255,255,0.85)" strokeWidth={2.2} />
          </button>

          <div
            className="shrink-0 flex h-12 w-12 items-center justify-center rounded-[15px]"
            style={{
              background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 50%, #B7791F 100%)',
              boxShadow: '0 6px 22px -6px rgba(217,119,6,0.65), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            <Cookie size={22} color="#fff" strokeWidth={2.3} />
          </div>

          <div className="min-w-0">
            <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#FBBF24] leading-none">
              Consentimento
            </p>
            <h1
              className="m-0 mt-1.5 text-[22px] font-black leading-none text-white tracking-tight"
              style={{ letterSpacing: '-0.02em' }}
            >
              Política de Cookies
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-4 py-5" style={{ paddingLeft: px, paddingRight: px }}>
        <CookieSection title="O que são cookies e tecnologias semelhantes">
          <p>Cookies, localStorage e sessionStorage são formas de guardar pequenas informações no navegador. No SmartRoute, eles ajudam a manter sessão, segurança, preferências e funcionamento da interface.</p>
        </CookieSection>

        <CookieSection title="Categorias usadas pelo SmartRoute">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-field p-4">
              <p className="m-0 text-sm font-extrabold text-ink">Necessários</p>
              <p className="m-0 mt-1 text-xs">Sempre ativos. Incluem sessão/autenticação do Supabase, segurança, navegação e estado técnico básico.</p>
            </div>
            <div className="rounded-2xl bg-field p-4">
              <p className="m-0 text-sm font-extrabold text-ink">Preferências</p>
              <p className="m-0 mt-1 text-xs">Guardam tema visual, layout, filtros e pequenos caches de experiência quando autorizados.</p>
            </div>
            <div className="rounded-2xl bg-field p-4">
              <p className="m-0 text-sm font-extrabold text-ink">Analíticos</p>
              <p className="m-0 mt-1 text-xs">Preparado para métricas futuras. Atualmente nenhum script analítico é carregado pelo app.</p>
            </div>
            <div className="rounded-2xl bg-field p-4">
              <p className="m-0 text-sm font-extrabold text-ink">Marketing</p>
              <p className="m-0 mt-1 text-xs">Desativado por padrão. Só deve ser ativado se o sistema adicionar esse tipo de recurso no futuro.</p>
            </div>
          </div>
        </CookieSection>

        <CookieSection title="Armazenamentos principais">
          <p><strong>smartroutes-auth-v1:</strong> necessário para sessão/autenticação do Supabase.</p>
          <p><strong>sr_motorista_*</strong>: cache técnico necessário para localizar o perfil do motorista autenticado.</p>
          <p><strong>sr_reset_success:</strong> indicador temporário de sucesso na redefinição de senha.</p>
          <p><strong>theme e sr_rotas_*:</strong> preferências/cache de experiência, usados apenas quando a categoria Preferências estiver autorizada.</p>
          <p><strong>smartroute-cookie-consent-v1:</strong> registro da sua decisão de consentimento, com data/hora e versão da política.</p>
        </CookieSection>

        <CookieSection title="Como alterar sua escolha">
          <p>Você pode aceitar todos, recusar não essenciais ou gerenciar categorias. Cookies necessários não podem ser desligados porque o app depende deles para funcionar.</p>
          <button
            type="button"
            onClick={openCookiePreferences}
            className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] border-0 bg-pending px-5 text-sm font-black text-[#212529]"
          >
            <SlidersHorizontal size={17} strokeWidth={2.5} />
            Gerenciar cookies
          </button>
        </CookieSection>

        <CookieSection title="Cookies não essenciais">
          <p>Recursos analíticos e marketing dependem de consentimento prévio. Se esses recursos forem adicionados no futuro, devem respeitar a escolha salva antes de carregar scripts ou registrar eventos.</p>
        </CookieSection>
      </main>
    </div>
  );
}
