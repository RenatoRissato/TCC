import { Bell, MessageCircle, Bus, CheckCircle2, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BottomSheetModal } from '../shared/BottomSheetModal';
import { EmptyState } from '../shared/EmptyState';
import type { NotificacaoRow, TipoNotificacao } from '../../types/database';

interface NotificacoesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lista: NotificacaoRow[];
  naoLidas: number;
  onMarcarComoLida: (id: string) => void;
  onMarcarTodasComoLidas: () => void;
}

function IconePorTipo({ tipo }: { tipo: TipoNotificacao }) {
  if (tipo === 'whatsapp_resposta') {
    return (
      <div className="w-9 h-9 rounded-full bg-whatsapp/15 flex items-center justify-center shrink-0">
        <MessageCircle size={18} className="text-whatsapp" />
      </div>
    );
  }
  if (tipo === 'viagem_iniciada') {
    return (
      <div className="w-9 h-9 rounded-full bg-pending/15 flex items-center justify-center shrink-0">
        <Bus size={18} className="text-pending" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-success/15 flex items-center justify-center shrink-0">
      <CheckCircle2 size={18} className="text-success" />
    </div>
  );
}

export function NotificacoesPanel({
  open, onOpenChange, lista, naoLidas, onMarcarComoLida, onMarcarTodasComoLidas,
}: NotificacoesPanelProps) {
  return (
    <BottomSheetModal
      open={open}
      onOpenChange={onOpenChange}
      title="Notificações"
      maxWidth={480}
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-app-border shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-extrabold text-ink m-0">Notificações</h2>
          {naoLidas > 0 && (
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-pending text-[11px] font-bold text-[#212529]">
              {naoLidas}
            </span>
          )}
        </div>
        {naoLidas > 0 && (
          <button
            onClick={onMarcarTodasComoLidas}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink transition-colors"
          >
            <CheckCheck size={14} />
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {lista.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Sem notificações"
            description="As atualizações de respostas e viagens aparecerão aqui."
          />
        ) : (
          <ul className="m-0 p-0 list-none">
            {lista.map((n) => {
              const quando = formatDistanceToNow(new Date(n.criada_em), {
                addSuffix: true,
                locale: ptBR,
              });
              return (
                <li
                  key={n.id}
                  onClick={() => { if (!n.lida) onMarcarComoLida(n.id); }}
                  className={[
                    'flex items-start gap-3 px-5 py-3 border-b border-app-border cursor-pointer transition-colors',
                    n.lida ? 'hover:bg-app-border/30' : 'bg-pending/[0.07] hover:bg-pending/[0.12]',
                  ].join(' ')}
                >
                  <IconePorTipo tipo={n.tipo} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm m-0 truncate ${n.lida ? 'font-semibold text-ink' : 'font-extrabold text-ink'}`}>
                        {n.titulo}
                      </p>
                      {!n.lida && (
                        <span className="w-2 h-2 rounded-full bg-pending shrink-0" aria-label="Não lida" />
                      )}
                    </div>
                    <p className="text-[13px] text-ink-soft m-0 mt-0.5 line-clamp-2">{n.mensagem}</p>
                    <p className="text-[11px] text-ink-muted m-0 mt-1">{quando}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </BottomSheetModal>
  );
}
