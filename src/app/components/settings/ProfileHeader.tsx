import { Menu, Moon, SunMedium, Edit3 } from 'lucide-react';

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
  onToggleTheme: () => void;
  onOpenDrawer: () => void;
  onEditProfile: () => void;
}

export function ProfileHeader({
  isDark, isLg, isDesktop, paddingX, user, stats,
  onToggleTheme, onOpenDrawer, onEditProfile,
}: ProfileHeaderProps) {
  const initials = (user?.name ?? 'CA')
    .split(' ').map((n) => n[0]).slice(0, 2).join('');

  return (
    <div
      className="relative overflow-hidden transition-colors duration-300"
      style={{
        background: isDark
          ? 'linear-gradient(160deg,#0A0D12 0%,#161B22 100%)'
          : 'linear-gradient(160deg,#161B22 0%,#212529 100%)',
        padding: `${isDesktop ? 28 : 24}px ${paddingX}px 28px`,
      }}
    >
      <div className="absolute -top-[50px] -right-[50px] w-[200px] h-[200px] rounded-full pointer-events-none bg-[rgba(255,193,7,0.06)]" />

      <div className="relative z-[1] flex items-center gap-4 mb-5">
        {!isLg && (
          <button
            onClick={onOpenDrawer}
            aria-label="Abrir menu de navegação"
            className="touch-scale w-11 h-11 rounded-[14px] shrink-0 bg-[rgba(255,255,255,0.08)] border-[1.5px] border-[rgba(255,255,255,0.12)] flex items-center justify-center cursor-pointer self-start"
          >
            <Menu size={20} color="rgba(255,255,255,0.8)" strokeWidth={2} />
          </button>
        )}

        <div className="relative">
          <div
            className="w-[72px] h-[72px] rounded-[22px] overflow-hidden flex items-center justify-center text-[28px] font-extrabold text-[#212529] tracking-[-1px]"
            style={{
              background: 'linear-gradient(135deg,#FFC107,#E6A800)',
              boxShadow: '0 4px 20px rgba(255,193,7,0.4)',
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
            className="absolute -bottom-[5px] -right-[5px] w-7 h-7 rounded-[9px] bg-pending flex items-center justify-center cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.35)] z-[2]"
            style={{ border: '2.5px solid #161B22' }}
          >
            <Edit3 size={13} color="#212529" strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold text-white m-0 mb-0.5 leading-tight truncate">
            {user?.name ?? 'Carlos Andrade'}
          </h1>
          <p className="text-xs text-[rgba(255,255,255,0.5)] m-0 mb-0.5 truncate">
            {user?.email ?? 'carlos@smartroutes.app'}
          </p>
          <p className="text-[11px] text-[rgba(255,255,255,0.32)] m-0 truncate">
            {user?.vehicle ?? 'Mercedes Sprinter 415 CDI · 2022'}
          </p>
        </div>

        {!isLg && (
          <button
            onClick={onToggleTheme}
            aria-label="Alternar tema"
            className="w-11 h-11 rounded-[14px] shrink-0 flex items-center justify-center cursor-pointer"
            style={{
              background: isDark ? 'rgba(255,193,7,0.15)' : 'rgba(255,255,255,0.08)',
              border: isDark ? '1.5px solid rgba(255,193,7,0.3)' : '1.5px solid rgba(255,255,255,0.08)',
            }}
          >
            {isDark
              ? <SunMedium size={20} color="#FFC107" strokeWidth={2} />
              : <Moon      size={20} color="rgba(255,255,255,0.7)" strokeWidth={2} />}
          </button>
        )}
      </div>

      <div className="relative z-[1] grid grid-cols-4 gap-2">
        {stats.map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-[rgba(255,255,255,0.07)] rounded-[14px] py-2.5 px-2 flex flex-col items-center gap-[3px]"
          >
            <span className="text-xl font-black leading-none" style={{ color }}>{value}</span>
            <span className="text-[9px] font-bold text-[rgba(255,255,255,0.4)] tracking-[0.5px]">
              {label.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
