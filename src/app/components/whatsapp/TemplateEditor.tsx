import { MessageCircle, RotateCcw, Send, CheckCircle2 } from 'lucide-react';
import { SLabel } from './SLabel';

const VARIABLES = ['[RESPONSÁVEL]', '[NOME]', '[DATA]', '[TURNO]'];

interface TemplateEditorProps {
  template: string;
  onChange: (v: string) => void;
  onReset: () => void;
  onSave: () => void;
  saved: boolean;
}

export function TemplateEditor({ template, onChange, onReset, onSave, saved }: TemplateEditorProps) {
  return (
    <section>
      <SLabel>Template de Mensagem</SLabel>
      <div className="bg-panel rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)] border-[1.5px] border-panel-border transition-colors duration-300">
        <div className="px-4 py-3 border-b border-divider bg-[#F8F9FA] dark:bg-[rgba(255,255,255,0.03)]">
          <p className="text-[10px] font-bold text-ink-soft m-0 mb-2 uppercase tracking-[0.06em]">
            Variáveis disponíveis
          </p>
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map((v) => (
              <span
                key={v}
                className="text-[11px] font-bold px-2 py-1 rounded-md cursor-pointer text-[#128C7E] bg-whatsapp/[0.08] border border-whatsapp/20 dark:bg-whatsapp/[0.12]"
              >
                {v}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-divider">
          <MessageCircle size={14} color="#25D366" fill="#25D366" />
          <span className="text-xs font-semibold text-[#128C7E]">Editor · WhatsApp</span>
        </div>
        <div className="px-4 py-3.5">
          <textarea
            value={template}
            onChange={(e) => onChange(e.target.value)}
            rows={7}
            className="w-full box-border bg-field border-2 border-field-border rounded-[14px] px-4 py-3.5 text-[13px] font-sans text-ink outline-none resize-y leading-[1.6] min-h-[140px] focus:border-whatsapp"
          />
          <p className="text-[11px] text-ink-muted m-0 mt-1.5">{template.length} caracteres</p>
        </div>
        <div className="flex gap-2.5 px-4 pb-4">
          <button
            onClick={onReset}
            className="touch-scale flex items-center gap-1.5 bg-transparent border-2 border-app-border rounded-[14px] px-4 py-3 text-[13px] font-semibold text-ink-soft cursor-pointer min-h-[48px] font-sans"
          >
            <RotateCcw size={15} strokeWidth={2.5} /> Resetar
          </button>
          <button
            onClick={onSave}
            className="touch-scale flex-1 flex items-center justify-center gap-2 border-0 rounded-[14px] px-6 py-3 text-sm font-bold text-white cursor-pointer min-h-[48px] font-sans transition-colors"
            style={{
              background: saved ? 'var(--success)' : 'linear-gradient(135deg,#25D366,#128C7E)',
            }}
          >
            {saved
              ? <><CheckCircle2 size={17} strokeWidth={2.5} />Salvo!</>
              : <><Send size={17} strokeWidth={2.5} />Salvar Template</>}
          </button>
        </div>
      </div>
    </section>
  );
}
