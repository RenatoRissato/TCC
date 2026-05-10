import {
  Wifi, WifiOff, Link2, RefreshCw, CheckCircle2, QrCode, Unlink,
} from 'lucide-react';
import { Spinner } from './Spinner';
import { SLabel } from './SLabel';
import type { InstanciaWhatsAppRow } from '../../types/database';

interface ConnectionStatusProps {
  instancia: InstanciaWhatsAppRow | null;
  conectado: boolean;
  verificandoConexao: boolean;
  solicitandoQr: boolean;
  desconectando: boolean;
  onVerificar: () => void;
  onConectar: () => void;
  onDesconectar: () => void;
}

function formatarTelefone(num: string | null | undefined): string {
  if (!num) return '—';
  const digitos = num.replace(/\D/g, '');
  if (digitos.length === 13) {
    return `+${digitos.slice(0, 2)} ${digitos.slice(2, 4)} ${digitos.slice(4, 9)}-${digitos.slice(9)}`;
  }
  if (digitos.length === 12) {
    return `+${digitos.slice(0, 2)} ${digitos.slice(2, 4)} ${digitos.slice(4, 8)}-${digitos.slice(8)}`;
  }
  return num;
}

function rotuloStatus(status: string | undefined, conectado: boolean): string {
  if (conectado) return 'WhatsApp Conectado';
  if (status === 'aguardando_qr') return 'Aguardando QR Code';
  if (status === 'conectando') return 'Conectando...';
  return 'WhatsApp Desconectado';
}

function subtituloStatus(status: string | undefined, conectado: boolean): string {
  if (conectado) return 'Bot ativo · Recebendo confirmações automaticamente';
  if (status === 'aguardando_qr') return 'Escaneie o QR Code com seu WhatsApp';
  if (status === 'conectando') return 'Estabelecendo sessão com o WhatsApp';
  return 'Toque em Conectar para escanear o QR Code';
}

export function ConnectionStatus({
  instancia, conectado, verificandoConexao, solicitandoQr, desconectando,
  onVerificar, onConectar, onDesconectar,
}: ConnectionStatusProps) {
  const numero = formatarTelefone(instancia?.numero_conta);
  const nomeWA = instancia?.nome_conta_wa;
  const totalEnviadas = instancia?.total_mensagens_enviadas ?? 0;
  const status = instancia?.status_conexao;
  const ultimaConexao = instancia?.data_ultima_conexao
    ? new Date(instancia.data_ultima_conexao).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : null;

  return (
    <section className="mb-0 md:mb-0">
      <SLabel>Status da Conexão</SLabel>
      <div
        className="bg-panel rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)] transition-colors duration-300"
        style={{ border: `1.5px solid ${conectado ? 'rgba(37,211,102,0.25)' : 'rgba(220,53,69,0.25)'}` }}
      >
        <div
          className="flex items-center gap-3.5 px-5 py-4 border-b border-divider"
          style={{
            background: conectado
              ? 'linear-gradient(135deg,rgba(37,211,102,.1),rgba(18,140,126,.06))'
              : 'linear-gradient(135deg,rgba(220,53,69,.1),rgba(220,53,69,.04))',
          }}
        >
          <div
            className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: conectado ? 'rgba(37,211,102,.15)' : 'rgba(220,53,69,.15)' }}
          >
            {conectado
              ? <Wifi    size={26} color="#25D366" strokeWidth={2} />
              : <WifiOff size={26} color="#DC3545" strokeWidth={2} />}
          </div>
          <div className="flex-1">
            <p className="text-base font-extrabold text-ink m-0 mb-0.5">
              {rotuloStatus(status, conectado)}
            </p>
            <p className="text-xs text-ink-soft m-0">
              {subtituloStatus(status, conectado)}
            </p>
          </div>
        </div>

        {conectado && (
          <div className="flex flex-col gap-1 px-5 py-3 border-b border-divider">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={16} color="#25D366" strokeWidth={2.5} />
              <span className="text-[13px] text-ink-soft font-medium">
                Conectado como <strong className="text-ink">{numero}</strong>
                {nomeWA ? <span className="text-ink-muted"> · {nomeWA}</span> : null}
              </span>
            </div>
            <div className="text-[11px] text-ink-muted pl-[26px]">
              Mensagens enviadas: <strong className="text-ink-soft">{totalEnviadas}</strong>
              {ultimaConexao ? <> · última conexão {ultimaConexao}</> : null}
            </div>
          </div>
        )}

        <div className="flex gap-2.5 px-4 py-3.5">
          {conectado ? (
            <button
              onClick={onVerificar}
              disabled={verificandoConexao}
              className="touch-scale flex-1 flex items-center justify-center gap-2 rounded-[14px] px-4 py-3 text-sm font-bold cursor-pointer min-h-[48px] font-sans disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg,#25D366,#128C7E)',
                color: '#fff',
              }}
            >
              {verificandoConexao
                ? <><Spinner size={17} />Verificando...</>
                : <><Link2 size={17} strokeWidth={2.5} />Verificar Conexão</>}
            </button>
          ) : (
            <button
              onClick={onConectar}
              disabled={solicitandoQr}
              className="touch-scale flex-1 flex items-center justify-center gap-2 rounded-[14px] px-4 py-3 text-sm font-bold cursor-pointer min-h-[48px] font-sans text-white disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg,#25D366,#128C7E)',
                boxShadow: '0 4px 16px rgba(37,211,102,0.3)',
              }}
            >
              {solicitandoQr
                ? <><Spinner size={17} />Gerando QR...</>
                : <><QrCode size={17} strokeWidth={2.5} />Conectar WhatsApp</>}
            </button>
          )}
          <button
            onClick={onVerificar}
            disabled={verificandoConexao || desconectando}
            aria-label="Atualizar status"
            title="Atualizar status"
            className="touch-scale w-12 h-12 rounded-[14px] bg-field border-2 border-app-border flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className="text-ink-soft"
              strokeWidth={2}
              style={{
                animation: verificandoConexao ? 'spin 0.8s linear infinite' : undefined,
              }}
            />
          </button>
          {conectado && (
            <button
              onClick={onDesconectar}
              disabled={desconectando || verificandoConexao}
              aria-label="Desconectar WhatsApp"
              title="Desconectar WhatsApp"
              className="touch-scale w-12 h-12 rounded-[14px] bg-danger text-white flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              {desconectando
                ? <Spinner size={18} />
                : <Unlink size={18} strokeWidth={2.4} />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
