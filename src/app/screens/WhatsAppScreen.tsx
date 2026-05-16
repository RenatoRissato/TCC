import { AlertTriangle, BarChart3, Smartphone, X } from 'lucide-react';
import { useState } from 'react';
import { useBreakpoints } from '../hooks/useWindowSize';
import { useNavDrawer } from '../context/NavDrawerContext';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { WhatsAppHeader } from '../components/whatsapp/WhatsAppHeader';
import { ConnectionStatus } from '../components/whatsapp/ConnectionStatus';
import { ScheduleCard } from '../components/whatsapp/ScheduleCard';
import { TemplateEditor } from '../components/whatsapp/TemplateEditor';
import { QrCodeModal } from '../components/whatsapp/QrCodeModal';
import { BottomSheetModal } from '../components/shared/BottomSheetModal';

function StatPill({ valor, rotulo, cor }: { valor: number; rotulo: string; cor: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center bg-panel rounded-2xl border-[1.5px] border-panel-border px-3 py-2.5 min-w-[88px]"
    >
      <span className="text-lg font-extrabold leading-none" style={{ color: cor }}>
        {valor}
      </span>
      <span className="text-[10px] font-bold text-ink-soft mt-1 uppercase tracking-[0.04em]">
        {rotulo}
      </span>
    </div>
  );
}

export function WhatsAppScreen() {
  const { isDesktop, isLg, isMd } = useBreakpoints();
  const { openDrawer } = useNavDrawer();
  const wa = useWhatsApp();
  const [modalCronBloqueado, setModalCronBloqueado] = useState(false);
  const px = isDesktop ? 32 : isMd ? 24 : 16;

  const desabilitarSalvarConfig = !wa.instancia || !wa.conectado;
  const desabilitarSalvarTemplate = !wa.template;

  return (
    <div className="bg-surface min-h-full transition-colors duration-300">
      <WhatsAppHeader
        connected={wa.conectado} isLg={isLg} paddingX={px}
        onOpenDrawer={openDrawer}
      />

      <div style={{ padding: `20px ${px}px 32px` }}>
        {wa.erro && (
          <div className="mb-4 flex items-start gap-2.5 bg-danger/10 border-[1.5px] border-danger/30 rounded-xl px-3.5 py-3">
            <AlertTriangle size={18} className="text-danger shrink-0 mt-px" strokeWidth={2.5} />
            <p className="text-[13px] font-semibold text-danger m-0">{wa.erro}</p>
          </div>
        )}

        {wa.estatisticas && (
          <section className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={14} className="text-ink-soft" strokeWidth={2.5} />
              <span className="text-[11px] font-bold text-ink-soft uppercase tracking-[0.06em]">
                Mensagens últimos 7 dias
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <StatPill valor={wa.estatisticas.enviadas}  rotulo="Enviadas"  cor="#2979FF" />
              <StatPill valor={wa.estatisticas.entregues} rotulo="Entregues" cor="#198754" />
              <StatPill valor={wa.estatisticas.recebidas} rotulo="Recebidas" cor="#25D366" />
              <StatPill valor={wa.estatisticas.falhas}    rotulo="Falhas"    cor="#DC3545" />
            </div>
          </section>
        )}

        {isDesktop ? (
          <div className="grid grid-cols-2 gap-6 items-start">
            <div>
              <ConnectionStatus
                instancia={wa.instancia}
                conectado={wa.conectado}
                verificandoConexao={wa.verificandoConexao}
                solicitandoQr={wa.solicitandoQr}
                desconectando={wa.desconectando}
                onVerificar={wa.verificarConexao}
                onConectar={wa.abrirConexao}
                onDesconectar={wa.desconectarConexao}
              />
            </div>
            <div className="flex flex-col gap-5">
              <ScheduleCard
                envioAutomaticoAtivo={wa.envioAutomaticoAtivo}
                conectado={wa.conectado}
                rotasEnvioAuto={wa.rotasEnvioAuto}
                onEnvioAutomaticoChange={wa.setEnvioAutomaticoAtivo}
                onRotaAutomacaoChange={wa.editarRotaEnvioAutomatico}
                onAtivacaoBloqueada={() => setModalCronBloqueado(true)}
                salvando={wa.salvandoConfig}
                onSalvar={wa.salvarHorarios}
                desabilitado={desabilitarSalvarConfig}
              />
              <TemplateEditor
                cabecalho={wa.cabecalhoEdit}
                rodape={wa.rodapeEdit}
                opcoes={wa.opcoesEdit}
                onCabecalhoChange={wa.setCabecalhoEdit}
                onRodapeChange={wa.setRodapeEdit}
                onOpcaoChange={wa.editarOpcao}
                onReset={wa.resetarTemplate}
                onSave={wa.salvarTemplateAtual}
                salvando={wa.salvandoTemplate}
                desabilitado={desabilitarSalvarTemplate}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <ConnectionStatus
              instancia={wa.instancia}
              conectado={wa.conectado}
              verificandoConexao={wa.verificandoConexao}
              solicitandoQr={wa.solicitandoQr}
              desconectando={wa.desconectando}
              onVerificar={wa.verificarConexao}
              onConectar={wa.abrirConexao}
              onDesconectar={wa.desconectarConexao}
            />
            <ScheduleCard
              envioAutomaticoAtivo={wa.envioAutomaticoAtivo}
              conectado={wa.conectado}
              rotasEnvioAuto={wa.rotasEnvioAuto}
              onEnvioAutomaticoChange={wa.setEnvioAutomaticoAtivo}
              onRotaAutomacaoChange={wa.editarRotaEnvioAutomatico}
              onAtivacaoBloqueada={() => setModalCronBloqueado(true)}
              salvando={wa.salvandoConfig}
              onSalvar={wa.salvarHorarios}
              desabilitado={desabilitarSalvarConfig}
            />
            <TemplateEditor
              cabecalho={wa.cabecalhoEdit}
              rodape={wa.rodapeEdit}
              opcoes={wa.opcoesEdit}
              onCabecalhoChange={wa.setCabecalhoEdit}
              onRodapeChange={wa.setRodapeEdit}
              onOpcaoChange={wa.editarOpcao}
              onReset={wa.resetarTemplate}
              onSave={wa.salvarTemplateAtual}
              salvando={wa.salvandoTemplate}
              desabilitado={desabilitarSalvarTemplate}
            />
          </div>
        )}

        <div className="flex items-start gap-3 bg-pending/[0.08] border-[1.5px] border-pending/25 rounded-2xl px-4 py-3.5 mt-5">
          <AlertTriangle size={18} color="#FFC107" strokeWidth={2.5} className="shrink-0 mt-px" />
          <div>
            <p className="text-[13px] font-bold m-0 mb-1 text-[#856404] dark:text-pending">
              Como funciona o Bot?
            </p>
            <p className="text-xs text-ink-soft m-0 leading-[1.6]">
              O SmartRoutes envia mensagens automáticas via WhatsApp Web API. Os responsáveis respondem com
              <strong> 1 </strong> a <strong>4</strong> conforme as opções acima, e o app atualiza a lista de rota em tempo real.
            </p>
          </div>
        </div>
      </div>

      <QrCodeModal
        open={wa.qrAberto}
        qr={wa.qrCode}
        pairingCode={wa.pairingCode}
        expirandoEm={wa.expirandoEm}
        solicitando={wa.solicitandoQr}
        onGerarNovo={wa.gerarNovoQr}
        onFechar={wa.fecharQr}
      />

      <BottomSheetModal
        open={modalCronBloqueado}
        onOpenChange={setModalCronBloqueado}
        title="Conectar WhatsApp Primeiro"
        hideHandle
        maxWidth={380}
        forceCenter
      >
        <div className="p-6 font-sans">
          <div className="w-14 h-14 rounded-[18px] bg-whatsapp/15 flex items-center justify-center mx-auto mb-4">
            <Smartphone size={26} className="text-whatsapp" strokeWidth={2.1} />
          </div>
          <p className="text-lg font-extrabold text-ink m-0 mb-2 text-center">
            Ative o WhatsApp antes do cron
          </p>
          <p className="text-[13px] text-ink-soft m-0 mb-6 text-center leading-normal">
            Para habilitar o envio automatico, conecte primeiro o WhatsApp escaneando o QR Code nesta tela.
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={() => setModalCronBloqueado(false)}
              className="flex-1 bg-transparent border-2 border-app-border rounded-[13px] py-3 text-sm font-bold text-ink-soft cursor-pointer min-h-12 flex items-center justify-center gap-2"
            >
              <X size={15} strokeWidth={2.5} />
              Fechar
            </button>
            <button
              onClick={() => {
                setModalCronBloqueado(false);
                void wa.abrirConexao();
              }}
              className="flex-1 border-0 rounded-[13px] py-3 text-sm font-bold text-white cursor-pointer min-h-12"
              style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}
            >
              Conectar Agora
            </button>
          </div>
        </div>
      </BottomSheetModal>
    </div>
  );
}
