import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Cookie, SlidersHorizontal } from 'lucide-react';
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
    <section className="rounded-[22px] border-[1.5px] border-app-border bg-panel p-5 shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
      <h2 className="m-0 mb-3 text-base font-black text-ink">{title}</h2>
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
        className="bg-[linear-gradient(160deg,#B7791F,#D97706)]"
        style={{ padding: `${isDesktop ? 28 : 20}px ${px}px ${isDesktop ? 34 : 28}px` }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (isLg ? navigate(-1) : openDrawer())}
            className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/15 bg-white/10"
            aria-label={isLg ? 'Voltar' : 'Abrir menu'}
          >
            <ArrowLeft size={20} color="#fff" strokeWidth={2.4} />
          </button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <Cookie size={24} color="#fff" strokeWidth={2.3} />
          </div>
          <div>
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-white/65">
              Consentimento
            </p>
            <h1 className="m-0 text-2xl font-black leading-tight text-white">Política de Cookies</h1>
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
