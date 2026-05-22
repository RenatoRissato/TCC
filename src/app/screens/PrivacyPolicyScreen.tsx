import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Database, MessageCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { useBreakpoints } from '../hooks/useWindowSize';
import { useNavDrawer } from '../context/NavDrawerContext';

function PolicyCard({
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

export function PrivacyPolicyScreen() {
  const navigate = useNavigate();
  const { isDesktop, isLg, isMd } = useBreakpoints();
  const { openDrawer } = useNavDrawer();
  const px = isDesktop ? 36 : isMd ? 24 : 16;

  return (
    <div className="min-h-full bg-surface transition-colors">
      <header
        className="relative overflow-hidden"
        style={{
          // Padrao consistente com o resto do app — gradient dark + halos da
          // cor tematica (teal escuro, mesmo accent que o AccordionItem de
          // Privacidade no Settings usa).
          background: 'linear-gradient(155deg, #0A0D12 0%, #161B22 55%, #1A1F26 100%)',
          padding: `${isDesktop ? 32 : 22}px ${px}px ${isDesktop ? 36 : 30}px`,
        }}
      >
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-[380px] h-[380px] pointer-events-none rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(15,118,110,0.20) 0%, transparent 65%)' }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-20 -left-20 w-[300px] h-[300px] pointer-events-none rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(15,118,110,0.08) 0%, transparent 65%)' }}
        />

        <div className="relative flex items-center gap-3">
          <button
            type="button"
            onClick={() => (isLg ? navigate(-1) : openDrawer())}
            className="sr-press flex h-11 w-11 items-center justify-center rounded-[14px] border-[1.5px] border-white/10 bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
            aria-label={isLg ? 'Voltar' : 'Abrir menu'}
          >
            <ArrowLeft size={20} color="rgba(255,255,255,0.85)" strokeWidth={2.2} />
          </button>

          {/* Icone tematico em teal escuro com gradient 3-stops + glow */}
          <div
            className="shrink-0 flex h-12 w-12 items-center justify-center rounded-[15px]"
            style={{
              background: 'linear-gradient(135deg, #2DD4BF 0%, #0F766E 50%, #115E59 100%)',
              boxShadow: '0 6px 22px -6px rgba(15,118,110,0.65), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            <ShieldCheck size={22} color="#fff" strokeWidth={2.3} />
          </div>

          <div className="min-w-0">
            <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#2DD4BF] leading-none">
              LGPD e transparência
            </p>
            <h1
              className="m-0 mt-1.5 text-[22px] font-black leading-none text-white tracking-tight"
              style={{ letterSpacing: '-0.02em' }}
            >
              Política de Privacidade
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-4 py-5" style={{ paddingLeft: px, paddingRight: px }}>
        <div className="rounded-[22px] border border-pending/25 bg-pending/10 p-4">
          <p className="m-0 text-sm font-semibold leading-relaxed text-ink-soft">
            Esta política explica, em linguagem simples, como o SmartRoute trata dados pessoais no contexto de um projeto acadêmico/TCC. Ela não substitui uma validação jurídica formal para uso comercial ou produção real.
          </p>
        </div>

        <PolicyCard title="Quais dados são tratados">
          <p>O sistema pode tratar nome do motorista, dados de login, telefone, foto de perfil, dados da van, alunos/passageiros, responsáveis, telefones, endereços de embarque, rotas, horários e confirmações diárias de presença.</p>
          <p>Também podem existir dados técnicos necessários, como identificadores internos, status de conexão do WhatsApp, preferências de tema e registros mínimos para funcionamento do sistema.</p>
        </PolicyCard>

        <PolicyCard title="Para que os dados são usados">
          <p>Os dados são usados para organizar rotas escolares, listar passageiros por rota, enviar confirmações via WhatsApp, registrar respostas dos responsáveis e apoiar o motorista na operação diária.</p>
          <p>As preferências são usadas para melhorar a experiência do usuário, como tema visual e configurações do aplicativo.</p>
        </PolicyCard>

        <PolicyCard title="Quem pode acessar">
          <p>O objetivo do SmartRoute é que cada motorista acesse apenas os dados vinculados à sua própria conta. A proteção efetiva depende das regras de autenticação, permissões e políticas RLS do Supabase/backend.</p>
          <p>Em ambiente real, administradores técnicos autorizados poderiam acessar dados apenas quando necessário para suporte, segurança ou obrigação legal.</p>
        </PolicyCard>

        <PolicyCard title="Como os dados são armazenados e mantidos">
          <p>Os dados principais ficam no banco de dados Supabase. No navegador, o sistema mantém apenas informações necessárias para sessão, funcionamento e preferências consentidas.</p>
          <p>O tempo de retenção deve seguir a finalidade do serviço. Em um TCC, recomenda-se manter dados somente enquanto forem necessários para demonstração e testes, evitando usar dados reais sem autorização.</p>
        </PolicyCard>

        <PolicyCard title="WhatsApp, Evolution API e terceiros">
          <p>Quando o WhatsApp é configurado, mensagens podem ser enviadas aos responsáveis para confirmar presença na van. A Evolution API intermedia essa comunicação e pode processar número de telefone, conteúdo da mensagem e status de envio.</p>
          <p>Funcionalidades de mapas e otimização de rotas podem usar APIs externas, como Google Maps, OSM ou OSRM. Nesses casos, endereços e pontos de rota podem ser enviados ao provedor para cálculo de geolocalização ou trajeto.</p>
        </PolicyCard>

        <PolicyCard title="Direitos do titular de dados">
          <p>Conforme a LGPD, titulares podem solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, exclusão, portabilidade, informações sobre compartilhamento e revisão de decisões automatizadas quando aplicável.</p>
          <p>Para solicitações, use o contato: <strong>renatorissatodasilva55@gmail.com</strong>. Encarregado pelo tratamento de dados: <strong>a definir</strong>.</p>
        </PolicyCard>

        <PolicyCard title="Segurança e observação acadêmica">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-field p-3">
              <UserCheck size={18} className="mb-2 text-success" />
              <p className="m-0 text-xs font-semibold">Acesso autenticado e dados separados por motorista.</p>
            </div>
            <div className="rounded-2xl bg-field p-3">
              <Database size={18} className="mb-2 text-pending" />
              <p className="m-0 text-xs font-semibold">Minimização de cache local para reduzir exposição no navegador.</p>
            </div>
            <div className="rounded-2xl bg-field p-3">
              <MessageCircle size={18} className="mb-2 text-whatsapp" />
              <p className="m-0 text-xs font-semibold">Transparência sobre uso de WhatsApp e APIs externas.</p>
            </div>
          </div>
        </PolicyCard>
      </main>
    </div>
  );
}
