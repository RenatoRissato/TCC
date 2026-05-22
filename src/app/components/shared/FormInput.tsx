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
  disabled?: boolean;
}

export function FormInput({
  label, icon: Icon, value, onChange,
  type = 'text', placeholder, rightEl, required, disabled,
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
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={[
            'w-full box-border bg-field border-2 border-field-border rounded-[13px]',
            'px-3.5 py-3 text-sm font-medium text-ink outline-none min-h-[50px]',
            // transicao suave em todos os estados (cor + shadow) — antes so
            // border-color animava, criando um "flash" do shadow no focus.
            'transition-[border-color,box-shadow,background-color] duration-200',
            // Hover so quando interativo (nao disabled): borda fica um tom mais
            // forte indicando que o input "responde". focus toma precedencia.
            !disabled ? 'hover:border-ink-muted/40 focus:border-pending focus:shadow-[0_0_0_3px_rgba(255,193,7,0.18)]' : '',
            rightEl ? 'pr-[46px]' : '',
            disabled ? 'opacity-60 cursor-not-allowed' : '',
          ].join(' ')}
        />
        {rightEl && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>
        )}
      </div>
    </div>
  );
}
