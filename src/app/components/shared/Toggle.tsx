type ToggleColor = 'success' | 'warning' | 'danger' | 'pending' | 'whatsapp' | 'info' | 'night';

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  color?: ToggleColor;
  ariaLabel?: string;
}

const COLOR_CLASS: Record<ToggleColor, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  pending: 'bg-pending',
  whatsapp: 'bg-whatsapp',
  info: 'bg-info',
  night: 'bg-night',
};

export function Toggle({ value, onChange, color = 'success', ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={ariaLabel}
      onClick={() => onChange(!value)}
      className={`relative w-[50px] h-7 rounded-[14px] border-0 cursor-pointer transition-colors p-0 shrink-0 ${value ? COLOR_CLASS[color] : 'bg-[#CED4DA]'}`}
    >
      <span
        className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.2)] transition-[left]"
        style={{ left: value ? 25 : 3 }}
      />
    </button>
  );
}
