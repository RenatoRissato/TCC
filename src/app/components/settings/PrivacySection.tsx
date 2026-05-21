import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Cookie, Database, ExternalLink, FileText, ShieldCheck, Trash2 } from 'lucide-react';
import { openCookiePreferences } from '../../utils/cookieConsent';

const CONTACT_EMAIL = 'contato@smartroute.com.br';

function PrivacyAction({
  icon,
  title,
  subtitle,
  onClick,
  href,
  accent = '#0F766E',
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick?: () => void;
  href?: string;
  accent?: string;
}) {
  const className = 'touch-scale w-full flex items-center gap-3 bg-surface border-[1.5px] rounded-[14px] px-4 py-3 cursor-pointer transition-colors text-left no-underline';
  const style = {
    borderColor: `${accent}55`,
  };
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]" style={{ background: `${accent}16`, color: accent }}>
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-ink">{title}</span>
        <span className="block text-[11px] leading-relaxed text-ink-soft">{subtitle}</span>
      </span>
      <ExternalLink size={15} style={{ color: accent }} strokeWidth={2.4} />
    </>
  );

  if (href) {
    return (
      <a href={href} className={className} style={style}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} style={style}>
      {content}
    </button>
  );
}

export function PrivacySection() {
  const navigate = useNavigate();

  const dadosSubject = encodeURIComponent('Solicitação de acesso aos meus dados - SmartRoute');
  const dadosBody = encodeURIComponent(
    'Olá! Gostaria de solicitar acesso aos dados pessoais vinculados à minha conta no SmartRoute.\n\nE-mail da conta:\nNome:\n',
  );
  const exclusaoSubject = encodeURIComponent('Solicitação de exclusão de dados - SmartRoute');
  const exclusaoBody = encodeURIComponent(
    'Olá! Gostaria de solicitar a exclusão dos dados pessoais vinculados à minha conta no SmartRoute.\n\nE-mail da conta:\nNome:\nObservação:\n',
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-success/25 bg-success/10 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <ShieldCheck size={18} className="mt-0.5 text-success" strokeWidth={2.5} />
          <p className="m-0 text-xs leading-relaxed text-ink-soft">
            O SmartRoute trata dados de alunos, responsáveis e rotas apenas para organizar o transporte escolar e a comunicação via WhatsApp. Em produção, valide bases legais, contratos e processos com apoio jurídico.
          </p>
        </div>
      </div>

      <PrivacyAction
        icon={<FileText size={18} strokeWidth={2.4} />}
        title="Política de Privacidade"
        subtitle="Entenda quais dados são tratados e para qual finalidade."
        onClick={() => navigate('/privacy')}
        accent="#0F766E"
      />
      <PrivacyAction
        icon={<Cookie size={18} strokeWidth={2.4} />}
        title="Política de Cookies"
        subtitle="Veja categorias de armazenamento e consentimento."
        onClick={() => navigate('/cookies')}
        accent="#D97706"
      />
      <PrivacyAction
        icon={<Cookie size={18} strokeWidth={2.4} />}
        title="Gerenciar cookies"
        subtitle="Altere consentimento de preferências, analíticos e marketing."
        onClick={openCookiePreferences}
        accent="#FFC107"
      />
      <PrivacyAction
        icon={<Database size={18} strokeWidth={2.4} />}
        title="Solicitar meus dados"
        subtitle="Abre um e-mail para pedir acesso aos dados da sua conta."
        href={`mailto:${CONTACT_EMAIL}?subject=${dadosSubject}&body=${dadosBody}`}
        accent="#2979FF"
      />
      <PrivacyAction
        icon={<Trash2 size={18} strokeWidth={2.4} />}
        title="Solicitar exclusão de dados"
        subtitle="Abre um e-mail para pedir remoção dos dados da sua conta."
        href={`mailto:${CONTACT_EMAIL}?subject=${exclusaoSubject}&body=${exclusaoBody}`}
        accent="#DC3545"
      />

      <div className="rounded-2xl border border-app-border bg-field px-4 py-3">
        <p className="m-0 text-[12px] font-bold text-ink">Contato LGPD</p>
        <p className="m-0 mt-1 text-[11px] leading-relaxed text-ink-soft">
          {CONTACT_EMAIL}<br />
          Encarregado pelo tratamento de dados: a definir
        </p>
      </div>
    </div>
  );
}
