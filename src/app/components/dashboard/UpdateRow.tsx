import { memo } from 'react';
import { Avatar } from '../shared/Avatar';
import {
  STATUS_UI_DETALHADO_META,
} from '../../utils/confirmacaoStatusMeta';
import type { StatusUIDetalhado } from '../../utils/confirmacaoStatus';
import type { WhatsAppUpdate } from '../../types';

export const UpdateRow = memo(function UpdateRow({ update }: { update: WhatsAppUpdate }) {
  // Mapeia o tipo detalhado da resposta para os metadados de cor/ícone/label.
  // Fallback: sem tipo conhecido, usa o agregado (going → ida_e_volta, absent → nao_vai).
  const tipoUi: StatusUIDetalhado =
    update.tipoConfirmacao ?? (update.status === 'going' ? 'ida_e_volta' : 'nao_vai');
  const meta = STATUS_UI_DETALHADO_META[tipoUi];

  return (
    <div className="flex items-center gap-3 py-[11px] border-b border-divider">
      <Avatar initials={update.initials} status={update.status} size={40} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-[13px] font-bold text-ink truncate">{update.name}</span>
          <span className="text-[11px] text-ink-muted font-medium shrink-0">{update.time}</span>
        </div>
        <p className="text-xs text-ink-soft m-0 truncate">{update.message}</p>
      </div>
      <div
        className="shrink-0 inline-flex items-center gap-1 px-[9px] py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-[0.04em]"
        style={{ background: meta.bg, color: meta.color }}
      >
        <meta.Icon size={10} strokeWidth={2.8} />
        {meta.labelCompacto}
      </div>
    </div>
  );
});
