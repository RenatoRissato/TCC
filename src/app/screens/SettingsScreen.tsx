import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  BarChart3, Users, Bell, Settings2, Sun, Lock, HelpCircle, LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useBreakpoints } from '../hooks/useWindowSize';
import { useNavDrawer } from '../context/NavDrawerContext';
import { useDailyList } from '../hooks/useDailyList';
import { usePassengers } from '../hooks/usePassengers';
import { AccordionItem } from '../components/settings/AccordionItem';
import { StatsSection } from '../components/settings/StatsSection';
import { PassengersSection } from '../components/settings/PassengersSection';
import { NotificationsSection } from '../components/settings/NotificationsSection';
import { PreferencesSection } from '../components/settings/PreferencesSection';
import { ShiftsSection } from '../components/settings/ShiftsSection';
import { PasswordSection } from '../components/settings/PasswordSection';
import { SupportSection } from '../components/settings/SupportSection';
import { ProfileHeader } from '../components/settings/ProfileHeader';
import { ProfileEditModal } from '../components/settings/ProfileEditModal';

type OpenKey = 'stats' | 'passengers' | 'notifications' | 'preferences'
             | 'shifts' | 'password' | 'support' | null;

export function SettingsScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { isDesktop, isLg, isMd } = useBreakpoints();
  const { openDrawer } = useNavDrawer();
  const { summary, pending } = useDailyList();
  const { list: passengers } = usePassengers();

  const [open, setOpen] = useState<OpenKey>(null);
  const [editProfile, setEditProfile] = useState(false);
  const [notifWA, setNotifWA] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifPending, setNotifPending] = useState(false);
  const [alertSound, setAlertSound] = useState('default');
  const [language, setLanguage] = useState('pt-BR');

  const toggle = (id: string) => setOpen((prev) => (prev === id ? null : (id as OpenKey)));
  const px = isDesktop ? 36 : isMd ? 24 : 16;

  const headerStats = [
    { label: 'Total',    value: passengers.length, color: '#FFC107' },
    { label: 'Vão',      value: summary.going,     color: '#4ADE80' },
    { label: 'Ausentes', value: summary.absent,    color: '#FF6B7A' },
    { label: 'Pend.',    value: summary.pending,   color: '#FD7E14' },
  ];

  return (
    <div className="bg-surface min-h-full transition-colors duration-300">
      <ProfileHeader
        isDark={isDark} isLg={isLg} isDesktop={isDesktop} paddingX={px}
        user={user}
        stats={headerStats}
        onToggleTheme={toggleTheme}
        onOpenDrawer={openDrawer}
        onEditProfile={() => setEditProfile(true)}
      />

      <div className="flex flex-col gap-2.5 py-5" style={{ paddingLeft: px, paddingRight: px }}>
        <AccordionItem
          id="stats" open={open === 'stats'} onToggle={toggle}
          icon={<BarChart3 size={22} color="#6C5CE7" strokeWidth={2} />}
          iconBg="rgba(108,92,231,0.12)"
          title="Estatísticas & Dashboards"
          subtitle="Presença hoje, confirmações semanais, taxa mensal"
          accent="#6C5CE7"
        >
          <StatsSection summary={summary} />
        </AccordionItem>

        <AccordionItem
          id="passengers" open={open === 'passengers'} onToggle={toggle}
          icon={<Users size={22} color="#0EA5E9" strokeWidth={2} />}
          iconBg="rgba(14,165,233,0.12)"
          title="Gerenciar Passageiros"
          subtitle={`${passengers.length} cadastrados · ${pending.length} sem resposta`}
          accent="#0EA5E9"
          badge={pending.length > 0 ? String(pending.length) : undefined}
        >
          <PassengersSection
            passengers={passengers}
            pending={pending}
            summary={summary}
            onNavigate={() => navigate('/routes')}
          />
        </AccordionItem>

        <AccordionItem
          id="notifications" open={open === 'notifications'} onToggle={toggle}
          icon={<Bell size={22} color="#F59E0B" strokeWidth={2} />}
          iconBg="rgba(245,158,11,0.12)"
          title="Notificações"
          subtitle="Alertas do WhatsApp, push e sons"
          accent="#F59E0B"
        >
          <NotificationsSection
            notifWA={notifWA} setNotifWA={setNotifWA}
            notifPush={notifPush} setNotifPush={setNotifPush}
            notifPending={notifPending} setNotifPending={setNotifPending}
            alertSound={alertSound} setAlertSound={setAlertSound}
          />
        </AccordionItem>

        <AccordionItem
          id="preferences" open={open === 'preferences'} onToggle={toggle}
          icon={<Settings2 size={22} color="#8B5CF6" strokeWidth={2} />}
          iconBg="rgba(139,92,246,0.12)"
          title="Preferências"
          subtitle="Tema escuro e idioma do aplicativo"
          accent="#8B5CF6"
        >
          <PreferencesSection
            isDark={isDark} toggleTheme={toggleTheme}
            language={language} setLanguage={setLanguage}
          />
        </AccordionItem>

        <AccordionItem
          id="shifts" open={open === 'shifts'} onToggle={toggle}
          icon={<Sun size={22} color="#FFC107" strokeWidth={2} />}
          iconBg="rgba(255,193,7,0.12)"
          title="Configurações de Turnos"
          subtitle="Ativar/desativar turnos e horários de saída"
          accent="#FFC107"
        >
          <ShiftsSection isDesktop={isDesktop} />
        </AccordionItem>

        <AccordionItem
          id="password" open={open === 'password'} onToggle={toggle}
          icon={<Lock size={22} color="#DC3545" strokeWidth={2} />}
          iconBg="rgba(220,53,69,0.12)"
          title="Alterar Senha"
          subtitle="Troque sua senha de acesso"
          accent="#DC3545"
        >
          <PasswordSection />
        </AccordionItem>

        <AccordionItem
          id="support" open={open === 'support'} onToggle={toggle}
          icon={<HelpCircle size={22} color="#14B8A6" strokeWidth={2} />}
          iconBg="rgba(20,184,166,0.12)"
          title="Suporte & Ajuda"
          subtitle="Central de ajuda, FAQs e tutoriais"
          accent="#14B8A6"
        >
          <SupportSection />
        </AccordionItem>

        <div className="mt-1">
          <button
            onClick={logout}
            aria-label="Sair da conta"
            className="w-full flex items-center justify-center gap-2.5 bg-transparent border-2 border-danger/45 rounded-[20px] py-4 px-6 text-base font-bold text-danger cursor-pointer min-h-[58px] font-sans transition-colors hover:bg-danger/10 hover:border-danger"
          >
            <LogOut size={20} strokeWidth={2.3} />
            Sair da Conta
          </button>
        </div>

        <div className="flex flex-col items-center gap-1 pt-2 pb-5">
          <p className="text-xs text-ink-muted m-0 font-semibold">SmartRoutes v3.0.0</p>
          <p className="text-[11px] text-ink-muted m-0 opacity-60">
            Feito com ❤️ para motoristas escolares
          </p>
        </div>
      </div>

      <ProfileEditModal
        open={editProfile}
        onOpenChange={setEditProfile}
        isDesktop={isDesktop}
        user={user}
      />
    </div>
  );
}
