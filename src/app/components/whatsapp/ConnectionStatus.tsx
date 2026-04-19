import {
  Wifi, WifiOff, Link2, Link2Off, RefreshCw, CheckCircle2,
} from 'lucide-react';
import { Spinner } from './Spinner';
import { QRPlaceholder } from './QRPlaceholder';
import { SLabel } from './SLabel';

interface ConnectionStatusProps {
  connected: boolean;
  connecting: boolean;
  showQR: boolean;
  onToggle: () => void;
}

export function ConnectionStatus({ connected, connecting, showQR, onToggle }: ConnectionStatusProps) {
  return (
    <section className="mb-0 md:mb-0">
      <SLabel>Status da Conexão</SLabel>
      <div
        className="bg-panel rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)] transition-colors duration-300"
        style={{ border: `1.5px solid ${connected ? 'rgba(37,211,102,0.25)' : 'rgba(220,53,69,0.25)'}` }}
      >
        <div
          className="flex items-center gap-3.5 px-5 py-4 border-b border-divider"
          style={{
            background: connected
              ? 'linear-gradient(135deg,rgba(37,211,102,.1),rgba(18,140,126,.06))'
              : 'linear-gradient(135deg,rgba(220,53,69,.1),rgba(220,53,69,.04))',
          }}
        >
          <div
            className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: connected ? 'rgba(37,211,102,.15)' : 'rgba(220,53,69,.15)' }}
          >
            {connected
              ? <Wifi    size={26} color="#25D366" strokeWidth={2} />
              : <WifiOff size={26} color="#DC3545" strokeWidth={2} />}
          </div>
          <div className="flex-1">
            <p className="text-base font-extrabold text-ink m-0 mb-0.5">
              {connected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
            </p>
            <p className="text-xs text-ink-soft m-0">
              {connected ? 'Bot ativo · Recebendo confirmações automaticamente' : 'Escaneie o QR Code para conectar'}
            </p>
          </div>
        </div>

        {connected && (
          <div className="flex items-center gap-2.5 px-5 py-3 border-b border-divider">
            <CheckCircle2 size={16} color="#25D366" strokeWidth={2.5} />
            <span className="text-[13px] text-ink-soft font-medium">
              Conectado como <strong className="text-ink">+55 11 99999-0001</strong>
            </span>
          </div>
        )}

        {showQR && !connected && (
          <div className="flex flex-col items-center px-5 py-6 gap-3.5 border-b border-divider">
            <div className="p-3 bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.15)]">
              <QRPlaceholder />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-bold text-ink m-0 mb-1">Escaneie com o WhatsApp</p>
              <p className="text-xs text-ink-soft m-0 leading-[1.5]">
                Abra o WhatsApp → Menu → Aparelhos Conectados → Conectar aparelho
              </p>
            </div>
            {connecting && (
              <div className="flex items-center gap-2 text-[#128C7E]">
                <Spinner />
                <span className="text-[13px] font-semibold">Aguardando leitura...</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2.5 px-4 py-3.5">
          <button
            onClick={onToggle}
            className="touch-scale flex-1 flex items-center justify-center gap-2 rounded-[14px] px-4 py-3 text-sm font-bold cursor-pointer min-h-[48px] font-sans"
            style={{
              background: connected ? 'rgba(220,53,69,.1)' : 'linear-gradient(135deg,#25D366,#128C7E)',
              border: connected ? '2px solid rgba(220,53,69,.3)' : 'none',
              color: connected ? '#DC3545' : '#fff',
            }}
          >
            {connected
              ? <><Link2Off size={17} strokeWidth={2.5} />Desconectar</>
              : connecting
              ? <><Spinner size={17} />Conectando...</>
              : <><Link2 size={17} strokeWidth={2.5} />Conectar via QR</>}
          </button>
          {connected && (
            <button
              className="touch-scale w-12 h-12 rounded-[14px] bg-field border-2 border-app-border flex items-center justify-center cursor-pointer"
              aria-label="Atualizar"
            >
              <RefreshCw size={18} className="text-ink-soft" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
