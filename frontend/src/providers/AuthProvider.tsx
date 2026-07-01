'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../domain/entities';

interface AuthContextType {
  user: User | null;
  isLogged: boolean;
  tenantId: string;
  login: (username: string, role: 'ROLE_USER' | 'ROLE_ADMIN') => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [tenantId, setTenantId] = useState<string>('d3b07384-d113-4ec2-a5d6-c8a7b6cf9110');

  useEffect(() => {
    const storedUser = localStorage.getItem('alfabra_user');
    const storedLogged = localStorage.getItem('alfabra_logged');
    const storedTenant = localStorage.getItem('alfabra_tenant');

    if (storedUser && storedLogged) {
      setUser(JSON.parse(storedUser));
      setIsLogged(storedLogged === 'true');
    } else {
      // Seed default user for PoC so the user starts logged in
      const defaultUser: User = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        username: 'admin',
        email: 'admin@company.com',
        firstName: 'Vitor',
        lastName: 'Tavares',
        status: 'ACTIVE',
        role: 'ROLE_ADMIN',
      };
      setUser(defaultUser);
      setIsLogged(true);
      localStorage.setItem('alfabra_user', JSON.stringify(defaultUser));
      localStorage.setItem('alfabra_logged', 'true');
    }

    if (storedTenant) {
      setTenantId(storedTenant);
    } else {
      localStorage.setItem('alfabra_tenant', tenantId);
    }
  }, []);

  const login = (username: string, role: 'ROLE_USER' | 'ROLE_ADMIN') => {
    const newUser: User = {
      id: role === 'ROLE_ADMIN' ? 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' : 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      username,
      email: `${username}@company.com`,
      firstName: username.charAt(0).toUpperCase() + username.slice(1),
      lastName: role === 'ROLE_ADMIN' ? 'Admin' : 'User',
      status: 'ACTIVE',
      role,
    };
    setUser(newUser);
    setIsLogged(true);
    localStorage.setItem('alfabra_user', JSON.stringify(newUser));
    localStorage.setItem('alfabra_logged', 'true');
  };

  const logout = () => {
    setUser(null);
    setIsLogged(false);
    localStorage.removeItem('alfabra_user');
    localStorage.removeItem('alfabra_logged');
  };

  return (
    <AuthContext.Provider value={{ user, isLogged, tenantId, login, logout }}>
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
