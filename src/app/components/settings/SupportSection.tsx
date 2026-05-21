import { useNavigate } from 'react-router';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { APP_VERSION } from '../../utils/appVersion';

const EMAIL_SUPORTE = 'renatorissatodasilva55@gmail.com';

/**
 * Monta um `mailto:` com assunto e corpo pré-preenchidos. O corpo inclui o
 * nome e o motorista_id (quando disponível) — facilita identificar de qual
 * conta o feedback veio sem pedir ao motorista que digite isso.
 */
function montarLinkEmail(opts: {
  nome?: string | null;
  motoristaId?: string | null;
}): string {
  const assunto = 'Feedback SmartRoutes';
  const linhas = [
    'Olá! Tenho um feedback ou bug pra reportar:',
    '',
    '',
    '— Informações para o suporte —',
    `Motorista: ${opts.nome ?? '—'}`,
    `ID: ${opts.motoristaId ?? '—'}`,
    `Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
  ];
  const corpo = linhas.join('\n');
  return `mailto:${EMAIL_SUPORTE}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

export function SupportSection() {
  const navigate = useNavigate();
  const { user, motoristaId } = useAuth();

  const anoAtual = new Date().getFullYear();

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* 1. Central de Ajuda — tela interna com FAQs */}
        <button
          type="button"
          onClick={() => navigate('/help')}
          className="touch-scale w-full flex items-center gap-3 bg-surface border-[1.5px] border-[#14B8A6]/35 rounded-[14px] px-4 py-3 cursor-pointer transition-colors hover:bg-[#14B8A6]/[0.06] hover:border-[#14B8A6]/60 text-left"
        >
          <span className="text-2xl shrink-0">📖</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-ink m-0">Central de Ajuda & FAQs</p>
            <p className="text-[11px] text-ink-soft m-0">Perguntas frequentes e guias de uso</p>
          </div>
          <ChevronRight size={16} className="text-[#14B8A6]" strokeWidth={2.5} />
        </button>

        {/* 2. Reportar bug ou sugestão — abre cliente de e-mail */}
        <a
          href={montarLinkEmail({ nome: user?.name, motoristaId })}
          className="touch-scale w-full flex items-center gap-3 bg-surface border-[1.5px] border-pending/35 rounded-[14px] px-4 py-3 cursor-pointer transition-colors no-underline hover:bg-pending/[0.06] hover:border-pending/60 text-left"
        >
          <span className="text-2xl shrink-0">📝</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-ink m-0">Reportar bug ou sugestão</p>
            <p className="text-[11px] text-ink-soft m-0">
              Abre seu app de e-mail com a mensagem pré-preenchida
            </p>
          </div>
          <ExternalLink size={16} className="text-pending" strokeWidth={2.2} />
        </a>
      </div>

      {/* Card de versão — usa a versão real do package.json */}
      <div className="mt-3.5 flex items-center gap-2.5 bg-field border border-app-border rounded-[14px] px-4 py-3">
        <span className="text-[22px]">🚌</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-ink m-0">SmartRoutes v{APP_VERSION}</p>
          <p className="text-[11px] text-ink-soft m-0">© {anoAtual}</p>
        </div>
      </div>
    </>
  );
}
