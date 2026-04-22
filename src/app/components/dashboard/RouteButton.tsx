import { Sunrise, Sun, Moon } from 'lucide-react';
import type { RouteConfig } from '../../types';

const ICON_MAP = { morning: Sunrise, afternoon: Sun, night: Moon };

interface RouteButtonProps extends RouteConfig {
  onClick: () => void;
}

export function RouteButton({ label, time, passengerCount, color, darkBg, type, onClick }: RouteButtonProps) {
  const Icon = ICON_MAP[type];
  return (
    <button
      onClick={onClick}
      className="touch-scale relative overflow-hidden flex flex-col items-start flex-1 min-h-[108px] rounded-[20px] px-3.5 py-4 font-sans cursor-pointer"
      style={{
        background: darkBg ? '#1E1B3A' : color,
        border: darkBg ? `2px solid ${color}40` : '2px solid transparent',
        boxShadow: darkBg ? `0 4px 24px ${color}28` : `0 4px 24px ${color}48`,
      }}
    >
      <div
        className="absolute -top-[18px] -right-[18px] w-[72px] h-[72px] rounded-full pointer-events-none"
        style={{ background: darkBg ? `${color}18` : 'rgba(255,255,255,0.2)' }}
      />
      <Icon size={22} color={darkBg ? color : '#212529'} strokeWidth={2} />
      <span
        className="text-[13px] font-extrabold leading-tight mt-2.5 mb-[3px]"
        style={{ color: darkBg ? '#fff' : '#212529' }}
      >
        {label}
      </span>
      <span
        className="text-[11px] font-medium"
        style={{ color: darkBg ? `${color}CC` : 'rgba(33,37,41,0.65)' }}
      >
        {time}
      </span>
      <div
        className="absolute bottom-2.5 right-2.5 flex items-center gap-[3px] rounded-[20px] px-2 py-[3px]"
        style={{ background: darkBg ? `${color}28` : 'rgba(33,37,41,0.1)' }}
      >
        <span className="text-[10px]">👤</span>
        <span
          className="text-[11px] font-bold"
          style={{ color: darkBg ? color : '#212529' }}
        >
          {passengerCount}
        </span>
      </div>
    </button>
  );
}
