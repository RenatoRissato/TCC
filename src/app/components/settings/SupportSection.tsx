import { ExternalLink } from 'lucide-react';

const LINKS = [
  { emoji: '📖', label: 'Central de Ajuda & FAQs', desc: 'Perguntas frequentes e guias de uso' },
  { emoji: '🎥', label: 'Tutoriais em Vídeo',       desc: 'Aprenda a usar todos os recursos' },
  { emoji: '💬', label: 'Chat com Suporte',          desc: 'Fale com nossa equipe ao vivo' },
  { emoji: '📧', label: 'Enviar Feedback',           desc: 'Sugestões e relatório de problemas' },
];

export function SupportSection() {
  return (
    <>
      <div className="flex flex-col gap-2">
        {LINKS.map((item) => (
          <a
            key={item.label}
            href="#"
            className="flex items-center gap-3 bg-surface border-[1.5px] border-app-border rounded-[14px] px-4 py-3 no-underline transition-colors hover:border-[#14B8A6]"
          >
            <span className="text-2xl shrink-0">{item.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink m-0">{item.label}</p>
              <p className="text-[11px] text-ink-soft m-0">{item.desc}</p>
            </div>
            <ExternalLink size={15} className="text-ink-muted" strokeWidth={2} />
          </a>
        ))}
      </div>
      <div className="mt-3.5 flex items-center gap-2.5 bg-field border border-app-border rounded-[14px] px-4 py-3">
        <span className="text-[22px]">🚌</span>
        <div className="flex-1">
          <p className="text-[13px] font-bold text-ink m-0">SmartRoutes v3.0.0</p>
          <p className="text-[11px] text-ink-soft m-0">Build 2026.03.20 · Licença SaaS Ativa</p>
        </div>
        <span className="text-[11px] font-bold text-success bg-success/10 px-2 py-1 rounded-lg">
          ✓ Atualizado
        </span>
      </div>
    </>
  );
}
