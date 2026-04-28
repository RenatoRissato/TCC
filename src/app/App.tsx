import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { router } from './routes';

type AuthView = 'login' | 'register';

function AuthGate() {
  const { isAuthenticated, loading } = useAuth();
  const [view, setView] = useState<AuthView>('login');

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0F1117', color: '#FFC107',
        fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600,
      }}>
        Carregando...
      </div>
    );
  }

  if (isAuthenticated) {
    return <RouterProvider router={router} />;
  }

  if (view === 'register') {
    return <RegisterScreen onGoLogin={() => setView('login')} />;
  }

  return <LoginScreen onGoRegister={() => setView('register')} />;
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
