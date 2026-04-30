import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { router } from './routes';

type AuthView = 'login' | 'register';

function AuthGate() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<AuthView>('login');

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
