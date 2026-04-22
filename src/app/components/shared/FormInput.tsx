import { ComponentType, ReactNode, useId } from 'react';

interface FormInputProps {
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string; color?: string }>;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  rightEl?: ReactNode;
  required?: boolean;
}

export function FormInput({
  label, icon: Icon, value, onChange,
  type = 'text', placeholder, rightEl, required,
}: FormInputProps) {
  const id = useId();
  return (
    <div className="mb-[14px]">
      <label
        htmlFor={id}
        className="flex items-center gap-[5px] text-xs font-bold text-ink-soft mb-1.5"
      >
        <Icon size={13} strokeWidth={2} className="text-ink-muted" />
        {label}
        {required && <span className="text-danger">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          className={[
            'w-full box-border bg-field border-2 border-field-border rounded-[13px]',
            'px-3.5 py-3 text-sm font-medium text-ink outline-none min-h-[50px] transition-colors',
            'focus:border-pending focus:shadow-[0_0_0_3px_rgba(255,193,7,0.12)]',
            rightEl ? 'pr-[46px]' : '',
          ].join(' ')}
        />
        {rightEl && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>
        )}
      </div>
    </div>
  );
}
