import { Smartphone, RefreshCw, X, Clock, KeyRound } from 'lucide-react';
import { BottomSheetModal } from '../shared/BottomSheetModal';
import { Spinner } from './Spinner';

interface QrCodeModalProps {
  open: boolean;
  qr: string | null;
  pairingCode: string | null;
  expirandoEm: number;       // segundos restantes
  solicitando: boolean;
  onGerarNovo: () => void;
  onFechar: () => void;
}

function formatarPairingCode(code: string): string {
  // 8 caracteres → "ABCD-EFGH" para facilitar digitação
  if (code.length === 8) return `${code.slice(0, 4)}-${code.slice(4)}`;
  return code;
}

export function QrCodeModal({
  open, qr, pairingCode, expirandoEm,
  solicitando, onGerarNovo, onFechar,
}: QrCodeModalProps) {
  const expirado = expirandoEm <= 0 && !solicitando;

  return (
    <BottomSheetModal
      open={open}
      onOpenChange={(v) => { if (!v) onFechar(); }}
      title="Conectar WhatsApp"
      hideHandle
      maxWidth={420}
      forceCenter
    >
      <div className="flex flex-col font-sans">
        <div className="px-5 pt-5 pb-3 border-b border-divider flex items-center gap-3">
          <div className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center bg-whatsapp/15">
            <Smartphone size={20} className="text-[#25D366]" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-extrabold text-ink m-0 leading-tight">
              Conectar WhatsApp
            </p>
            <p className="text-xs text-ink-soft m-0">
              Escaneie o QR Code com o app
            </p>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="w-9 h-9 rounded-[11px] bg-field border border-app-border cursor-pointer flex items-center justify-center"
          >
            <X size={18} className="text-ink-soft" strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col items-center gap-4">
          <div
            className="relative w-[256px] h-[256px] rounded-2xl bg-white p-3 shadow-[0_4px_24px_rgba(0,0,0,0.15)] flex items-center justify-center"
            style={{ border: '2px solid var(--app-border)' }}
          >
            {solicitando && !qr && (
              <div className="flex flex-col items-center gap-2 text-ink-soft">
                <Spinner size={28} />
                <span className="text-xs font-semibold">Gerando QR...</span>
              </div>
            )}
            {qr && !expirado && (
              <img
                src={qr}
                alt="QR Code para conectar WhatsApp"
                className="w-full h-full object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            )}
            {expirado && qr && (
              <div className="absolute inset-3 bg-white/90 rounded-xl flex flex-col items-center justify-center gap-2 text-ink-soft">
                <Clock size={24} className="text-warning" strokeWidth={2} />
                <p className="text-xs font-bold m-0 text-ink">QR expirado</p>
                <p className="text-[11px] m-0">Gere um novo abaixo</p>
              </div>
            )}
          </div>

          {expirandoEm > 0 && !expirado && (
            <div className="flex items-center gap-2 text-ink-soft">
              <Clock size={14} strokeWidth={2.2} />
              <span className="text-[12px] font-bold tabular-nums">
                Expira em {expirandoEm}s
              </span>
            </div>
          )}

          {pairingCode && (
            <div className="w-full bg-field border-[1.5px] border-app-border rounded-2xl px-3.5 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-[11px] bg-pending/15 flex items-center justify-center shrink-0">
                <KeyRound size={16} className="text-pending" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-ink-soft uppercase tracking-[0.06em] m-0">
                  Código de pareamento
                </p>
                <p className="text-base font-black text-ink m-0 tracking-[2px] tabular-nums">
                  {formatarPairingCode(pairingCode)}
                </p>
              </div>
            </div>
          )}

          <ol className="w-full bg-pending/[0.06] border border-pending/20 rounded-xl px-4 py-3 list-decimal list-inside text-[11px] text-ink-soft m-0 leading-[1.65] space-y-0.5">
            <li>Abra o <strong className="text-ink">WhatsApp</strong> no celular</li>
            <li>Toque em <strong className="text-ink">Mais opções</strong> → <strong className="text-ink">Aparelhos conectados</strong></li>
            <li>Toque em <strong className="text-ink">Conectar um aparelho</strong> e escaneie</li>
          </ol>
        </div>

        <div className="px-5 pb-5 pt-1 flex gap-2.5">
          <button
            onClick={onFechar}
            className="flex-1 flex items-center justify-center gap-1.5 bg-transparent border-2 border-app-border rounded-[14px] px-4 py-3 text-[13px] font-bold text-ink-soft cursor-pointer min-h-[48px] font-sans"
          >
            <X size={16} strokeWidth={2.5} /> Fechar
          </button>
          <button
            onClick={onGerarNovo}
            disabled={solicitando}
            className="flex-1 flex items-center justify-center gap-2 border-0 rounded-[14px] px-4 py-3 text-sm font-bold text-white cursor-pointer min-h-[48px] font-sans disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}
          >
            {solicitando
              ? <><Spinner size={17} />Gerando...</>
              : <><RefreshCw size={17} strokeWidth={2.5} />Gerar novo QR</>}
          </button>
        </div>
      </div>
    </BottomSheetModal>
  );
}
