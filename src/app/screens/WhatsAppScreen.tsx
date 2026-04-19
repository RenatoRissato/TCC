import { AlertTriangle } from 'lucide-react';
import { useBreakpoints } from '../hooks/useWindowSize';
import { useNavDrawer } from '../context/NavDrawerContext';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { WhatsAppHeader } from '../components/whatsapp/WhatsAppHeader';
import { ConnectionStatus } from '../components/whatsapp/ConnectionStatus';
import { ScheduleCard } from '../components/whatsapp/ScheduleCard';
import { TemplateEditor } from '../components/whatsapp/TemplateEditor';

export function WhatsAppScreen() {
  const { isDesktop, isLg, isMd } = useBreakpoints();
  const { openDrawer } = useNavDrawer();
  const wa = useWhatsApp();
  const px = isDesktop ? 32 : isMd ? 24 : 16;

  return (
    <div className="bg-surface min-h-full transition-colors duration-300">
      <WhatsAppHeader
        connected={wa.connected} isLg={isLg} paddingX={px}
        onOpenDrawer={openDrawer}
      />

      <div style={{ padding: `20px ${px}px 32px` }}>
        {isDesktop ? (
          <div className="grid grid-cols-2 gap-6 items-start">
            <div>
              <ConnectionStatus
                connected={wa.connected} connecting={wa.connecting}
                showQR={wa.showQR} onToggle={wa.toggleConnection}
              />
            </div>
            <div className="flex flex-col gap-5">
              <ScheduleCard
                morning={wa.morning} afternoon={wa.afternoon} night={wa.night}
                onMorning={wa.setMorning} onAfternoon={wa.setAfternoon} onNight={wa.setNight}
                saved={wa.schedSaved} onSave={wa.saveSchedule}
              />
              <TemplateEditor
                template={wa.template} onChange={wa.setTemplate}
                onReset={wa.resetTemplate} onSave={wa.saveTemplate}
                saved={wa.tmplSaved}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <ConnectionStatus
              connected={wa.connected} connecting={wa.connecting}
              showQR={wa.showQR} onToggle={wa.toggleConnection}
            />
            <ScheduleCard
              morning={wa.morning} afternoon={wa.afternoon} night={wa.night}
              onMorning={wa.setMorning} onAfternoon={wa.setAfternoon} onNight={wa.setNight}
              saved={wa.schedSaved} onSave={wa.saveSchedule}
            />
            <TemplateEditor
              template={wa.template} onChange={wa.setTemplate}
              onReset={wa.resetTemplate} onSave={wa.saveTemplate}
              saved={wa.tmplSaved}
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
              O SmartRoutes envia mensagens automáticas via WhatsApp Web API. Os responsáveis respondem com <strong>1</strong> (Vai) ou <strong>2</strong> (Não vai), e o app atualiza a lista de rota em tempo real.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
