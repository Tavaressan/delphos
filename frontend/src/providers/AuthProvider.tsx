'use client';

import React, { createContext, useContext, useState } from 'react';
import { User } from '../domain/entities';
import { authRepository } from '../infrastructure/repositories/AuthRepository';

interface AuthContextType {
  user: User | null;
  isLogged: boolean;
  tenantId: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_TENANT_ID = 'd3b07384-d113-4ec2-a5d6-c8a7b6cf9110';

function readStoredUser(): User | null {
  if (typeof localStorage === 'undefined') return null;
  const storedUser = localStorage.getItem('alfabra_user');
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser) as User;
  } catch {
    return null;
  }
}

function readStoredTenant(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_TENANT_ID;
  return localStorage.getItem('alfabra_tenant') || DEFAULT_TENANT_ID;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Estado inicial lido de forma síncrona (sem useEffect / sem seed padrão):
  // visitantes sem sessão válida em localStorage começam deslogados (issue #316).
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [tenantId] = useState<string>(() => readStoredTenant());

  const login = async (username: string, password: string) => {
    // Credenciais são sempre validadas contra o backend/mock — o role nunca é
    // decidido pelo chamador (issue #316). Rejeita (throw) em caso de falha.
    const authenticatedUser = await authRepository.login(username, password);

    setUser(authenticatedUser);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('alfabra_user', JSON.stringify(authenticatedUser));
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('alfabra_user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLogged: user !== null, tenantId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
