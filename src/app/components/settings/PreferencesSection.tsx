import { useState } from 'react';
import { toast } from 'sonner';
import { Moon, SunMedium, Globe, Save } from 'lucide-react';
import { Toggle } from '../shared/Toggle';
import { Spinner } from '../whatsapp/Spinner';
import { useAuth } from '../../context/AuthContext';
import { atualizarPreferenciasMotorista } from '../../services/motoristaService';
import type { IdiomaApp } from '../../types';

interface PreferencesSectionProps {
  isDark: boolean;
  toggleTheme: () => void;
}

export function PreferencesSection({ isDark, toggleTheme }: PreferencesSectionProps) {
  const { user, motoristaId, recarregarMotorista } = useAuth();
  const [idioma, setIdioma] = useState<IdiomaApp>(user?.idioma ?? 'pt-BR');
  const [salvando, setSalvando] = useState(false);

  const handleSalvar = async () => {
    if (!motoristaId) {
      toast.error('Perfil do motorista não carregado.');
      return;
    }
    setSalvando(true);
    const r = await atualizarPreferenciasMotorista({
      motoristaId,
      idioma,
    });
    setSalvando(false);
    if (!r.ok) {
      toast.error('Não foi possível salvar.', { description: r.erro });
      return;
    }
    await recarregarMotorista();
    toast.success('Preferências salvas.');
  };

  return (
    <>
      <div
        className="flex items-center gap-3.5 p-4 rounded-2xl mb-3.5"
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
            {isDark ? 'Melhor para uso noturno 🌙' : 'Melhor para ambientes iluminados ☀️'}
          </p>
        </div>
        <Toggle value={isDark} onChange={toggleTheme} color="pending" />
      </div>

      <label className="flex items-center gap-1.5 text-xs font-bold text-ink-soft mb-2">
        <Globe size={14} className="text-ink-muted" strokeWidth={2} />
        Idioma do Aplicativo
      </label>
      <select
        value={idioma}
        onChange={(e) => setIdioma(e.target.value as IdiomaApp)}
        className="w-full box-border bg-field border-2 border-field-border rounded-xl px-3 py-2.5 text-sm font-medium text-ink outline-none font-sans cursor-pointer min-h-[46px]"
      >
        <option value="pt-BR">🇧🇷 Português – PT-BR</option>
        <option value="en">🇺🇸 English – EN</option>
        <option value="es">🇪🇸 Español – ES</option>
      </select>
      <p className="text-[11px] text-ink-muted m-0 mt-2">
        * Alterações de idioma aplicadas no próximo login.
      </p>

      <button
        onClick={handleSalvar}
        disabled={salvando}
        className="mt-4 w-full flex items-center justify-center gap-2 border-0 rounded-[14px] py-3 px-6 text-sm font-bold cursor-pointer min-h-[50px] font-sans transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        style={{ background: 'var(--pending)', color: '#212529' }}
      >
        {salvando
          ? <><Spinner size={17} />Salvando...</>
          : <><Save size={17} strokeWidth={2.5} />Salvar Preferências</>}
      </button>
    </>
  );
}
