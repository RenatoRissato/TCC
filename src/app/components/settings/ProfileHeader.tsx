import { Menu, Edit3 } from 'lucide-react';
import { AnimatedNumber } from '../shared/AnimatedNumber';

interface Stat {
  label: string;
  value: number;
  color: string;
}

interface ProfileHeaderProps {
  isDark: boolean;
  isLg: boolean;
  isDesktop: boolean;
  paddingX: number;
  user: { name?: string; email?: string; vehicle?: string; avatar?: string | null } | null;
  stats: Stat[];
  onOpenDrawer: () => void;
  onEditProfile: () => void;
}

/**
 * Header da tela de Configuracoes. Compoe:
 *  - Botao hamburguer (mobile)
 *  - Avatar amarelo com selo de edicao
 *  - Nome, email, veiculo
 *  - 4 cards de stats compactos (TOTAL/VAO/AUSENTES/PEND.)
 *
 * O toggle de tema deixou de viver aqui — agora mora no AccordionItem
 * "Preferencias" logo abaixo, eliminando duplicacao e o "envelope amarelo"
 * que poluia o canto direito.
 */
export function ProfileHeader({
  isLg, isDesktop, paddingX, user, stats,
  onOpenDrawer, onEditProfile,
}: ProfileHeaderProps) {
  const initials = (user?.name ?? 'SmartRoutes')
    .split(' ').map((n) => n[0]).slice(0, 2).join('');

  return (
    <div
      className="relative overflow-hidden transition-colors duration-300"
      style={{
        // Gradient diagonal mais sutil: dois tons proximos de cinza-escuro
        // criam profundidade sem competir com os destaques amarelos.
        background: 'linear-gradient(155deg, #0A0D12 0%, #161B22 55%, #1A1F26 100%)',
        padding: `${isDesktop ? 28 : 24}px ${paddingX}px ${isDesktop ? 24 : 20}px`,
      }}
    >
      {/* Atmosfera: dois halos radiais amarelos posicionados em diagonais
          opostas. Sem chamar atencao isoladamente — so dao volume ao header
          quando voce escaneia rapido. pointer-events:none pra nao bloquear. */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-24 w-[280px] h-[280px] pointer-events-none rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,193,7,0.12) 0%, transparent 70%)' }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-20 -left-20 w-[260px] h-[260px] pointer-events-none rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,193,7,0.06) 0%, transparent 70%)' }}
      />

      <div className="relative z-[1] flex items-center gap-4 mb-5">
        {!isLg && (
          <button
            onClick={onOpenDrawer}
            aria-label="Abrir menu de navegação"
            className="touch-scale sr-press w-11 h-11 rounded-[14px] shrink-0 bg-white/[0.06] border-[1.5px] border-white/10 flex items-center justify-center cursor-pointer self-start hover:bg-white/[0.1] transition-colors"
          >
            <Menu size={20} color="rgba(255,255,255,0.85)" strokeWidth={2.2} />
          </button>
        )}

        <div className="relative shrink-0">
          {/* Ring amarelo translucido por tras do avatar — refina o "halo"
              do avatar sem competir com o glow do FAB. */}
          <span
            aria-hidden="true"
            className="absolute -inset-1.5 rounded-[26px] pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,193,7,0.22) 0%, transparent 70%)' }}
          />
          <div
            className="relative w-[72px] h-[72px] rounded-[22px] overflow-hidden flex items-center justify-center text-[28px] font-extrabold text-[#212529] tracking-[-1px]"
            style={{
              background: 'linear-gradient(135deg, #FFD54F 0%, #FFC107 50%, #E6A800 100%)',
              boxShadow: '0 6px 24px -6px rgba(255,193,7,0.55), inset 0 1px 0 rgba(255,255,255,0.35)',
            }}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user?.name ?? 'Foto de perfil'} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <button
            onClick={onEditProfile}
            aria-label="Editar perfil"
            className="sr-press absolute -bottom-1 -right-1 w-7 h-7 rounded-[9px] bg-pending flex items-center justify-center cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.35)] z-[2]"
            style={{ border: '2.5px solid #161B22' }}
          >
            <Edit3 size={13} color="#212529" strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <h1
            className="text-[20px] font-black text-white m-0 mb-1 leading-tight truncate tracking-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            {user?.name ?? 'Motorista'}
          </h1>
          <p className="text-[12px] text-white/55 m-0 mb-0.5 truncate font-medium">
            {user?.email ?? 'Perfil em carregamento'}
          </p>
          <p className="text-[11px] text-white/35 m-0 truncate">
            {user?.vehicle ?? 'Dados da van não informados'}
          </p>
        </div>
      </div>

      {/* Stats — 4 cards com tint colorido da metrica. AnimatedNumber faz o
          valor "contar" quando entra ou quando atualiza. Mantem o grid 4
          colunas pra nao crescer o header em mobile. */}
      <div className="relative z-[1] grid grid-cols-4 gap-2">
        {stats.map(({ label, value, color }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-[3px] rounded-[14px] py-2.5 px-2 transition-colors"
            style={{
              background: `${color}14`,
              border: `1px solid ${color}28`,
            }}
          >
            <span className="text-xl font-black leading-none" style={{ color }}>
              <AnimatedNumber value={value} />
            </span>
            <span
              className="text-[9px] font-extrabold tracking-[0.08em] uppercase"
              style={{ color: `${color}99` }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
