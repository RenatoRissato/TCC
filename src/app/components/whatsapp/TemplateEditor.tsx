import { MessageCircle, RotateCcw, Send, Hash } from 'lucide-react';
import { SLabel } from './SLabel';
import { Spinner } from './Spinner';
import type { OpcaoTemplateState } from '../../hooks/useWhatsApp';

const VARIAVEIS = ['{nome_passageiro}', '{data_formatada}'];

interface TemplateEditorProps {
  cabecalho: string;
  rodape: string;
  opcoes: OpcaoTemplateState[];
  onCabecalhoChange: (v: string) => void;
  onRodapeChange: (v: string) => void;
  onOpcaoChange: (numero: number, texto: string) => void;
  onReset: () => void;
  onSave: () => void;
  salvando: boolean;
  desabilitado?: boolean;
}

function ChipVariavel({ texto }: { texto: string }) {
  return (
    <span className="text-[11px] font-bold px-2 py-1 rounded-md text-[#128C7E] bg-whatsapp/[0.08] border border-whatsapp/20 dark:bg-whatsapp/[0.12]">
      {texto}
    </span>
  );
}

export function TemplateEditor({
  cabecalho, rodape, opcoes,
  onCabecalhoChange, onRodapeChange, onOpcaoChange,
  onReset, onSave, salvando, desabilitado,
}: TemplateEditorProps) {
  return (
    <section>
      <SLabel>Template de Mensagem</SLabel>
      <div className="bg-panel rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)] border-[1.5px] border-panel-border transition-colors duration-300">
        <div className="px-4 py-3 border-b border-divider bg-[#F8F9FA] dark:bg-[rgba(255,255,255,0.03)]">
          <p className="text-[10px] font-bold text-ink-soft m-0 mb-2 uppercase tracking-[0.06em]">
            Variáveis disponíveis
          </p>
          <div className="flex flex-wrap gap-1.5">
            {VARIAVEIS.map((v) => (
              <ChipVariavel key={v} texto={v} />
            ))}
          </div>
          <p className="text-[10px] text-ink-muted m-0 mt-2 leading-[1.5]">
            Use as variáveis acima no cabeçalho ou rodapé. Elas serão substituídas no envio.
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-divider">
          <MessageCircle size={14} color="#25D366" fill="#25D366" />
          <span className="text-xs font-semibold text-[#128C7E]">Editor · WhatsApp</span>
        </div>

        <div className="px-4 py-3.5 flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-ink-soft uppercase tracking-[0.06em]">
              Cabeçalho
            </span>
            <textarea
              value={cabecalho}
              onChange={(e) => onCabecalhoChange(e.target.value)}
              rows={3}
              className="w-full box-border bg-field border-2 border-field-border rounded-[14px] px-4 py-3 text-[13px] font-sans text-ink outline-none resize-y leading-[1.6] min-h-[80px] focus:border-whatsapp"
              placeholder="Olá {nome_passageiro}, vai usar a van em {data_formatada}?"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-ink-soft uppercase tracking-[0.06em]">
              Opções de resposta (1 a 4)
            </span>
            <div className="flex flex-col gap-2">
              {opcoes.map((op) => (
                <div
                  key={op.numero}
                  className="flex items-center gap-2.5 bg-field border-2 border-field-border rounded-[12px] px-3 py-2"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-whatsapp/15"
                    aria-hidden
                  >
                    <Hash size={14} color="#25D366" strokeWidth={2.5} />
                    <span className="sr-only">Opção {op.numero}</span>
                  </div>
                  <span className="text-[12px] font-bold text-ink-soft shrink-0 w-4 text-center">
                    {op.numero}
                  </span>
                  <input
                    type="text"
                    value={op.texto_exibido}
                    onChange={(e) => onOpcaoChange(op.numero, e.target.value)}
                    className="flex-1 bg-transparent border-0 text-[13px] font-medium text-ink outline-none font-sans"
                  />
                  <span className="text-[10px] font-bold text-ink-muted px-2 py-0.5 rounded-md bg-app-border/30 shrink-0">
                    {op.tipo_confirmacao.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-ink-muted m-0 mt-1">
              As 4 opções são fixas e mapeadas para o tipo de confirmação.
              Você pode editar somente o texto exibido.
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-ink-soft uppercase tracking-[0.06em]">
              Rodapé
            </span>
            <textarea
              value={rodape}
              onChange={(e) => onRodapeChange(e.target.value)}
              rows={2}
              className="w-full box-border bg-field border-2 border-field-border rounded-[14px] px-4 py-3 text-[13px] font-sans text-ink outline-none resize-y leading-[1.6] min-h-[64px] focus:border-whatsapp"
              placeholder="Responda com o número da opção desejada."
            />
          </label>
        </div>

        <div className="flex gap-2.5 px-4 pb-4">
          <button
            onClick={onReset}
            disabled={salvando}
            className="touch-scale flex items-center gap-1.5 bg-transparent border-2 border-app-border rounded-[14px] px-4 py-3 text-[13px] font-semibold text-ink-soft cursor-pointer min-h-[48px] font-sans disabled:opacity-50"
          >
            <RotateCcw size={15} strokeWidth={2.5} /> Resetar
          </button>
          <button
            onClick={onSave}
            disabled={salvando || desabilitado}
            className="touch-scale flex-1 flex items-center justify-center gap-2 border-0 rounded-[14px] px-6 py-3 text-sm font-bold text-white cursor-pointer min-h-[48px] font-sans transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg,#25D366,#128C7E)',
            }}
          >
            {salvando
              ? <><Spinner size={17} />Salvando...</>
              : <><Send size={17} strokeWidth={2.5} />Salvar Template</>}
          </button>
        </div>
      </div>
    </section>
  );
}
