import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ isDark: false, toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(v => !v);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export interface ThemeColors {
  bg: string;
  card: string;
  cardBorder: string;
  cardShadow: string;
  text: string;
  textSec: string;
  textMuted: string;
  divider: string;
  border: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  touchFeedback: string;
  sectionTitle: string;
  badgeGoing: string;
  badgeAbsent: string;
  badgePending: string;
  updateBorder: string;
  axisColor: string;
  gridColor: string;
}

export function useColors(): ThemeColors {
  const { isDark } = useTheme();
  return isDark
    ? {
        bg: '#0F1117',
        card: '#1C2128',
        cardBorder: 'rgba(255,255,255,0.07)',
        cardShadow: '0 2px 16px rgba(0,0,0,0.5)',
        text: '#F8F9FA',
        textSec: '#ADB5BD',
        textMuted: '#6C757D',
        divider: 'rgba(255,255,255,0.06)',
        border: 'rgba(255,255,255,0.08)',
        inputBg: 'rgba(255,255,255,0.06)',
        inputBorder: 'rgba(255,255,255,0.12)',
        inputText: '#F8F9FA',
        touchFeedback: 'rgba(255,255,255,0.05)',
        sectionTitle: '#8A9BB0',
        badgeGoing: 'rgba(25,135,84,0.2)',
        badgeAbsent: 'rgba(220,53,69,0.2)',
        badgePending: 'rgba(253,126,20,0.2)',
        updateBorder: 'rgba(255,255,255,0.06)',
        axisColor: '#6C757D',
        gridColor: 'rgba(255,255,255,0.06)',
      }
    : {
        bg: '#F0F2F5',
        card: '#FFFFFF',
        cardBorder: 'transparent',
        cardShadow: '0 2px 12px rgba(0,0,0,0.07)',
        text: '#212529',
        textSec: '#6C757D',
        textMuted: '#ADB5BD',
        divider: '#F1F3F5',
        border: '#E9ECEF',
        inputBg: '#F8F9FA',
        inputBorder: '#E9ECEF',
        inputText: '#212529',
        touchFeedback: '#F8F9FA',
        sectionTitle: '#6C757D',
        badgeGoing: '#E8F5E9',
        badgeAbsent: '#FFEBEE',
        badgePending: '#FFF3E0',
        updateBorder: '#F1F3F5',
        axisColor: '#ADB5BD',
        gridColor: '#F1F3F5',
      };
}
