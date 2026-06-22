import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, ArrowLeft, ClipboardCheck, Menu, ShieldCheck, UsersRound } from 'lucide-react';
import { useBreakpoints } from '../hooks/useWindowSize';
import { useNavDrawer } from '../context/NavDrawerContext';

function TermsCard({
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

export function TermsOfUseScreen() {
  const navigate = useNavigate();
  const { isDesktop, isLg, isMd } = useBreakpoints();
  const { openDrawer } = useNavDrawer();
  const px = isDesktop ? 36 : isMd ? 24 : 16;

  return (
    <div className="min-h-full bg-surface transition-colors">
      <header
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(155deg, #0A0D12 0%, #161B22 55%, #1A1F26 100%)',
          padding: `${isDesktop ? 32 : 22}px ${px}px ${isDesktop ? 36 : 30}px`,
        }}
      >
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-[380px] h-[380px] pointer-events-none rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,193,7,0.18) 0%, transparent 65%)' }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-20 -left-20 w-[300px] h-[300px] pointer-events-none rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 65%)' }}
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
              background: 'linear-gradient(135deg, #FFC107 0%, #D97706 52%, #92400E 100%)',
              boxShadow: '0 6px 22px -6px rgba(217,119,6,0.7), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            <ClipboardCheck size={22} color="#fff" strokeWidth={2.3} />
          </div>

          <div className="min-w-0">
            <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#FFC107] leading-none">
              Uso do sistema
            </p>
            <h1
              className="m-0 mt-1.5 text-[22px] font-black leading-none text-white tracking-tight"
              style={{ letterSpacing: '-0.02em' }}
            >
              Termos de Uso
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-4 py-5" style={{ paddingLeft: px, paddingRight: px }}>
        <div className="rounded-[22px] border border-pending/25 bg-pending/10 p-4">
          <p className="m-0 text-sm font-semibold leading-relaxed text-ink-soft">
            Estes termos explicam as regras de uso do SmartRoute em linguagem simples. O sistema foi desenvolvido como projeto acadêmico/TCC e não substitui contratos, análise jurídica ou procedimentos operacionais formais de transporte escolar.
          </p>
        </div>

        <TermsCard title="Finalidade do SmartRoute">
          <p>O SmartRoute é um sistema de apoio para motoristas de vans escolares organizarem alunos, responsáveis, rotas, horários e confirmações diárias de presença via WhatsApp.</p>
          <p>O sistema ajuda na gestão e comunicação, mas não executa transporte, não monitora passageiros em tempo real e não substitui a responsabilidade humana do motorista, responsável ou prestador do serviço.</p>
        </TermsCard>

        <TermsCard title="Cadastro e uso correto">
          <p>Ao criar uma conta, o usuário deve informar dados corretos e manter atualizados dados como telefone, veículo, rotas, alunos e responsáveis.</p>
          <p>O motorista é responsável por conferir as informações antes de usar o sistema para enviar mensagens, iniciar viagens ou tomar decisões operacionais.</p>
        </TermsCard>

        <TermsCard title="Dados pessoais e LGPD">
          <p>O sistema pode tratar dados pessoais como nome do motorista, telefone, dados da van, alunos, responsáveis, endereços, rotas e confirmações de presença.</p>
          <p>Esses dados devem ser usados apenas para organização da rota escolar, comunicação com responsáveis e funcionamento do SmartRoute, respeitando a finalidade informada e os princípios da LGPD.</p>
          <p>O usuário deve evitar cadastrar dados desnecessários, dados falsos ou informações reais de crianças/responsáveis sem autorização adequada.</p>
        </TermsCard>

        <TermsCard title="WhatsApp, mensagens e confirmações">
          <p>Quando a integração estiver ativa, o sistema pode enviar mensagens automáticas aos responsáveis para confirmar presença na van.</p>
          <p>As respostas recebidas ajudam a atualizar o status dos alunos, mas o motorista deve conferir situações críticas e não depender exclusivamente de uma mensagem automática para decisões de segurança.</p>
        </TermsCard>

        <TermsCard title="Limitação de responsabilidade sobre passageiros">
          <div className="rounded-2xl border border-danger/25 bg-danger/10 p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle size={18} className="text-danger" strokeWidth={2.5} />
              <p className="m-0 text-sm font-black text-ink">Aviso importante</p>
            </div>
            <p className="m-0 text-sm leading-relaxed text-ink-soft">
              Apesar de ser um sistema voltado ao contexto escolar, o SmartRoute é uma ferramenta de apoio à organização e comunicação. O sistema não se responsabiliza pela vida, integridade física, embarque, desembarque, presença real, ausência, localização ou segurança dos passageiros. A responsabilidade pela condução, conferência, supervisão e segurança permanece com o motorista, responsáveis legais, escola e/ou prestador do transporte, conforme o caso.
            </p>
          </div>
        </TermsCard>

        <TermsCard title="Disponibilidade e integrações externas">
          <p>Algumas funções dependem de serviços externos, como Supabase, Evolution API, WhatsApp, provedores de hospedagem e APIs de mapas.</p>
          <p>Falhas, instabilidades, bloqueios, limites de plano, indisponibilidade ou mudanças nesses serviços podem afetar QR Code, envio de mensagens, webhooks, mapas e automações.</p>
        </TermsCard>

        <TermsCard title="Projeto acadêmico/TCC">
          <p>O SmartRoute foi construído com foco acadêmico para demonstrar uma solução tecnológica aplicada ao transporte escolar.</p>
          <p>Para uso comercial ou produção real, recomenda-se validação jurídica, revisão de segurança, contrato com usuários, política formal de privacidade, termo operacional e processos claros de suporte, retenção e exclusão de dados.</p>
        </TermsCard>

        <TermsCard title="Boas práticas esperadas">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-field p-3">
              <UsersRound size={18} className="mb-2 text-success" />
              <p className="m-0 text-xs font-semibold">Usar dados corretos e autorizados de alunos e responsáveis.</p>
            </div>
            <div className="rounded-2xl bg-field p-3">
              <ShieldCheck size={18} className="mb-2 text-pending" />
              <p className="m-0 text-xs font-semibold">Proteger login, senha e acesso ao painel do motorista.</p>
            </div>
            <div className="rounded-2xl bg-field p-3">
              <ClipboardCheck size={18} className="mb-2 text-whatsapp" />
              <p className="m-0 text-xs font-semibold">Conferir manualmente informações importantes antes da viagem.</p>
            </div>
          </div>
        </TermsCard>
      </main>
    </div>
  );
}
