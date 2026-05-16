import { Moon, SunMedium } from 'lucide-react';
import { Toggle } from '../shared/Toggle';

interface PreferencesSectionProps {
  isDark: boolean;
  toggleTheme: () => void;
}

export function PreferencesSection({ isDark, toggleTheme }: PreferencesSectionProps) {
  return (
    <div
      className="flex items-center gap-3.5 p-4 rounded-2xl"
      style={{
        background: isDark ? 'rgba(255,193,7,0.07)' : 'rgba(0,0,0,0.03)',
        border: `1.5px solid ${isDark ? 'rgba(255,193,7,0.2)' : 'var(--app-border)'}`,
      }}
    >
      <div
        className="w-[42px] h-[42px] rounded-[13px] flex items-center justify-center"
        style={{ background: isDark ? 'rgba(255,193,7,0.15)' : 'rgba(108,117,125,0.1)' }}
      >
        {isDark
          ? <Moon size={20} color="#FFC107" strokeWidth={2} />
          : <SunMedium size={20} color="#6C757D" strokeWidth={2} />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-ink m-0">
          {isDark ? 'Modo Escuro Ativo' : 'Modo Claro Ativo'}
        </p>
        <p className="text-xs text-ink-soft m-0">
          {isDark ? 'Melhor para uso noturno' : 'Melhor para ambientes iluminados'}
        </p>
      </div>
      <Toggle value={isDark} onChange={toggleTheme} color="pending" />
    </div>
  );
}
