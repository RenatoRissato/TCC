import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './screens/ResetPasswordScreen';
import { publicLegalRouter, router } from './routes';

type AuthView = 'login' | 'register' | 'forgot';

// Detecta se a URL atual é o destino do link de redefinição enviado por email.
// É o único caminho em que precisamos pular o gate de autenticação: o usuário
// chega aqui com sessão de recovery e não com sessão normal.
function isResetPath(): boolean {
  return typeof window !== 'undefined' && window.location.pathname === '/redefinir-senha';
}

function isPublicLegalPath(): boolean {
  if (typeof window === 'undefined') return false;
  return ['/terms', '/privacy', '/cookies'].includes(window.location.pathname);
}

function AuthGate() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  // Se a URL é /redefinir-senha, mostramos ResetPasswordScreen ignorando o
  // gate de auth (o link do email cria sessão de recovery que faria o gate
  // achar que o usuário está logado). Após o reset, a ResetPasswordScreen
  // faz hard reload em '/', então não precisamos de setState aqui.
  const resetando = isResetPath();
  const publicLegalPath = isPublicLegalPath();

  useEffect(() => {
    if (!isAuthenticated && !resetando) setView('login');
  }, [isAuthenticated, resetando]);

  if (resetando) {
    return <ResetPasswordScreen />;
  }

  if (!isAuthenticated && publicLegalPath) {
    return <RouterProvider router={publicLegalRouter} />;
  }

  if (isAuthenticated) {
    return <RouterProvider router={router} />;
  }

  if (view === 'register') {
    return <RegisterScreen onGoLogin={() => setView('login')} />;
  }

  if (view === 'forgot') {
    return <ForgotPasswordScreen onGoLogin={() => setView('login')} />;
  }

  return (
    <LoginScreen
      onGoRegister={() => setView('register')}
      onGoForgot={() => setView('forgot')}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AuthGate />
      </ThemeProvider>
    </AuthProvider>
  );
}
