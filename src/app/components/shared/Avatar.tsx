import type { StudentStatus } from '../../types';

interface AvatarProps {
  initials: string;
  status?: StudentStatus;
  size?: number;
  badge?: string | number;
}

const STATUS_CLASS: Record<StudentStatus, string> = {
  going:   'bg-going-soft border-success text-success',
  absent:  'bg-[#F5F5F5] dark:bg-absent-soft border-[#ADB5BD] text-[#868E96] dark:text-ink-soft',
  pending: 'bg-pending-soft border-warning text-[#C56A00] dark:text-warning',
};

export function Avatar({ initials, status = 'going', size = 48, badge }: AvatarProps) {
  return (
    <div className="relative shrink-0">
      <div
        className={`rounded-full border-[2.5px] flex items-center justify-center font-bold shrink-0 ${STATUS_CLASS[status]}`}
        style={{ width: size, height: size, fontSize: size * 0.28 }}
      >
        {initials}
      </div>
      {badge !== undefined && (
        <span className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] bg-[#212529] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
          {badge}
        </span>
      )}
    </div>
  );
}
