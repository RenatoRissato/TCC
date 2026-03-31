import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  name: string;
  email: string;
  phone: string;
  plate: string;
  vehicle: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USER: User = {
  name: 'Carlos Andrade',
  email: 'carlos@smartroutes.app',
  phone: '+55 11 99999-0001',
  plate: 'BRA-2E19',
  vehicle: 'Mercedes Sprinter 415 CDI · 2022',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, _password: string): Promise<boolean> => {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 900));
    // Accept any non-empty credentials for demo
    if (email.trim()) {
      setUser(MOCK_USER);
      return true;
    }
    return false;
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 1000));
    if (data.name && data.email) {
      setUser({ ...MOCK_USER, name: data.name, email: data.email, phone: data.phone });
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
