import { ComponentType, useState } from 'react';
import { toast } from 'sonner';
import { MessageCircle, Volume2, Save, Play } from 'lucide-react';
import { Toggle } from '../shared/Toggle';
import { Spinner } from '../whatsapp/Spinner';
import { useAuth } from '../../context/AuthContext';
import { atualizarPreferenciasMotorista } from '../../services/motoristaService';
import { tocarSomAlerta } from '../../utils/somAlerta';
import type { SomAlerta } from '../../types';

interface ToggleRowProps {
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  iconColor: string;
  title: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}

function ToggleRow({ icon: Icon, iconColor, title, desc, value, onChange, last }: ToggleRowProps) {
  return (
    <div className={`flex items-center gap-3.5 py-[13px] ${last ? '' : 'border-b border-divider'}`}>
      <div
        className="w-[38px] h-[38px] rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${iconColor}18` }}
      >
        <Icon size={18} color={iconColor} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink m-0">{title}</p>
        <p className="text-[11px] text-ink-soft m-0 mt-0.5 leading-[1.4]">{desc}</p>
      </div>
      <Toggle value={value} onChange={onChange} color="success" />
    </div>
  );
}

const OPCOES_SOM: Array<{ valor: SomAlerta; rotulo: string }> = [
  { valor: 'default', rotulo: '🔔 Padrão' },
  { valor: 'chime',   rotulo: '🎵 Chime Suave' },
  { valor: 'bell',    rotulo: '🛎️ Sino' },
  { valor: 'ding',    rotulo: '✨ Ding' },
];

export function NotificationsSection() {
  const { user, motoristaId, recarregarMotorista } = useAuth();

  // Hidrata a partir do user (já carregado pelo AuthContext).
  // `notif_whatsapp` controla o toast in-app. `som_alerta` controla o beep.
  // O toggle de som é derivado: `som === 'none'` → desligado.
  const [toastResposta, setToastResposta] = useState(user?.notifWhatsApp ?? true);
  const somAtual = user?.somAlerta ?? 'default';
  const [somAtivo, setSomAtivo] = useState<boolean>(somAtual !== 'none');
  const [somEscolhido, setSomEscolhido] = useState<SomAlerta>(
    somAtual === 'none' ? 'default' : somAtual,
  );
  const [salvando, setSalvando] = useState(false);

  const handleSalvar = async () => {
    if (!motoristaId) {
      toast.error('Perfil do motorista não carregado.');
      return;
    }
    setSalvando(true);
    const r = await atualizarPreferenciasMotorista({
      motoristaId,
      notifWhatsapp: toastResposta,
      somAlerta: somAtivo ? somEscolhido : 'none',
    });
    setSalvando(false);
    if (!r.ok) {
      toast.error('Não foi possível salvar.', { description: r.erro });
      return;
    }
    await recarregarMotorista();
    toast.success('Preferências de notificação salvas.');
  };

  const handleTestarSom = () => {
    // Toca o som mesmo se o toggle estiver desligado — é um preview.
    tocarSomAlerta(somEscolhido);
  };

  return (
    <>
      <ToggleRow
        icon={MessageCircle} iconColor="#25D366"
        title="Toast ao receber resposta"
        desc="Mostra um alerta no canto da tela quando um responsável responder via WhatsApp."
        value={toastResposta} onChange={setToastResposta}
      />
      <ToggleRow
        icon={Volume2} iconColor="#FFC107"
        title="Tocar som ao receber resposta"
        desc="Reproduz um beep curto quando uma nova confirmação chega."
        value={somAtivo} onChange={setSomAtivo}
        last
      />

      {somAtivo && (
        <div className="pt-3.5">
          <label className="flex items-center gap-1.5 text-xs font-bold text-ink-soft mb-2">
            <Volume2 size={14} className="text-ink-muted" strokeWidth={2} />
            Tipo de som
          </label>
          <div className="flex gap-2 items-stretch">
            <select
              value={somEscolhido}
              onChange={(e) => setSomEscolhido(e.target.value as SomAlerta)}
              className="flex-1 box-border bg-field border-2 border-field-border rounded-xl px-3 py-2.5 text-sm font-medium text-ink outline-none font-sans cursor-pointer min-h-[46px]"
            >
              {OPCOES_SOM.map((o) => (
                <option key={o.valor} value={o.valor}>{o.rotulo}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleTestarSom}
              aria-label="Testar som"
              title="Tocar prévia"
              className="shrink-0 flex items-center justify-center gap-1.5 rounded-xl border-2 border-pending/40 bg-pending/15 text-pending px-3.5 text-[12px] font-bold cursor-pointer min-h-[46px] hover:bg-pending/25 transition-colors"
            >
              <Play size={13} strokeWidth={2.8} fill="currentColor" />
              Testar
            </button>
          </div>
        </div>
      )}

      <button
        onClick={handleSalvar}
        disabled={salvando}
        className="mt-4 w-full flex items-center justify-center gap-2 border-0 rounded-[14px] py-3 px-6 text-sm font-bold cursor-pointer min-h-[50px] font-sans transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        style={{ background: 'var(--pending)', color: '#212529' }}
      >
        {salvando
          ? <><Spinner size={17} />Salvando...</>
          : <><Save size={17} strokeWidth={2.5} />Salvar Notificações</>}
      </button>
    </>
  );
}
