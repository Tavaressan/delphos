'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { ChevronDown, ShieldCheck, LogOut, Activity, Sun, Moon } from 'lucide-react';
import { apiClient } from '../../infrastructure/api/apiClient';

export const Header: React.FC = () => {
  const { user, isLogged, tenantId, logout } = useAuth();
  const [tenant, setTenant] = useState<string>('Alfabra Elevadores - Matriz');
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await apiClient.get<{ status: string }>('/actuator/health', { timeout: 3000 });
        setIsBackendOnline(response?.status === 'UP');
      } catch (error) {
        setIsBackendOnline(false);
      }
    };

    // Check immediately and then every 30 seconds
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme === 'dark' || (!savedTheme && systemTheme === 'dark') ? 'dark' : 'light';
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'VT';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 bg-surface border-b border-border-color flex items-center justify-between px-6 z-10 shadow-sm flex-shrink-0 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <img src="/assets/images/LogoMarca_Alfabra.png" alt="Alfabra Logo" className="h-8 object-contain dark:brightness-0 dark:invert transition-all duration-200" />
        <span className="h-5 w-[1px] bg-border-color" />
        <h1 className="text-sm font-bold tracking-wider text-primary select-none heading-font uppercase">
          Enterprise Agent Operating Platform
        </h1>
      </div>

      <div className="flex items-center gap-6">
        {/* Health Check Status Indicator */}
        <div className="flex items-center gap-1.5 text-xs">
          <Activity className={`w-4 h-4 ${isBackendOnline === true ? 'text-success' : isBackendOnline === false ? 'text-danger' : 'text-slate-400'}`} />
          <span className="font-mono text-[10px] uppercase font-bold text-text-secondary">
            Backend: {isBackendOnline === true ? (
              <span className="text-success font-bold">Online</span>
            ) : isBackendOnline === false ? (
              <span className="text-danger font-bold">Offline</span>
            ) : (
              <span className="text-slate-400">Verificando...</span>
            )}
          </span>
        </div>

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="text-text-secondary hover:text-text-primary p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 flex items-center justify-center"
          aria-label="Alternar Tema"
        >
          {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
        </button>

        {isLogged && user ? (
          <div className="flex items-center gap-4 text-xs font-body">
            {/* Tenant Selection */}
            <div className="relative flex items-center gap-1.5 bg-secondary/30 dark:bg-slate-900/50 border border-border-color rounded px-3 py-1.5 cursor-pointer group hover:bg-secondary/50 dark:hover:bg-slate-900 transition-all duration-150">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="font-semibold text-text-secondary">{tenant}</span>
              <ChevronDown className="w-3 h-3 text-text-secondary group-hover:text-text-primary" />
              
              <div className="absolute right-0 top-full mt-1.5 bg-surface border border-border-color rounded shadow-lg hidden group-hover:block w-52 overflow-hidden z-20">
                <div onClick={() => setTenant('Alfabra Elevadores - Matriz')} className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-text-primary">Alfabra Elevadores - Matriz</div>
                <div onClick={() => setTenant('Alfabra Infra - Global')} className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-text-primary">Alfabra Infra - Global</div>
              </div>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary text-white font-bold flex items-center justify-center text-sm shadow-sm select-none">
                {getInitials(user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username)}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-text-primary">{user.firstName} {user.lastName}</span>
                <span className="text-[10px] uppercase bg-secondary/40 dark:bg-slate-900/50 text-text-secondary px-1 py-0.5 rounded font-mono font-bold border border-border-color flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5 text-primary" /> ROLE_ADMIN
                </span>
              </div>
            </div>

            <button onClick={logout} className="text-text-secondary hover:text-danger hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded transition-all duration-200">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-xs">
            <span className="text-text-secondary">Acesso Restrito</span>
          </div>
        )}
      </div>
    </header>
  );
};
