import { memo } from 'react';
import { Avatar } from '../shared/Avatar';
import type { WhatsAppUpdate } from '../../types';

export const UpdateRow = memo(function UpdateRow({ update }: { update: WhatsAppUpdate }) {
  const going = update.status === 'going';
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
        className={`shrink-0 px-[9px] py-1 rounded-lg text-[10px] font-extrabold ${
          going
            ? 'bg-going-soft text-success'
            : 'bg-absent-soft text-danger'
        }`}
      >
        {going ? 'VAI' : 'NÃO'}
      </div>
    </div>
  );
});
