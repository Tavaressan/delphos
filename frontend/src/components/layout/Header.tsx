'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { ChevronDown, ShieldCheck, LogOut, Activity, Sun, Moon, Menu } from 'lucide-react';
import { apiClient } from '../../infrastructure/api/apiClient';
import { useTheme } from '../../hooks/useTheme';
import Link from 'next/link';

export const Header: React.FC = () => {
  const { user, isLogged, logout } = useAuth();

  const openMobileSidebar = () => window.dispatchEvent(new Event('mobile-sidebar-open'));
  const [tenant, setTenant] = useState<string>('Alfabra Elevadores - Matriz');
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const { theme, toggleTheme } = useTheme();

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
    <header className="h-14 bg-surface/95 backdrop-blur-sm border-b border-border-color flex items-center justify-between px-4 md:px-6 z-10 shadow-sm flex-shrink-0 transition-colors duration-200">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={openMobileSidebar}
          className="md:hidden text-text-secondary hover:text-text-primary p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* Logo em cor sólida (mesma cor do título, text-primary) via mask-image, pois é um PNG raster sem suporte a currentColor.
            Em dark mode, a cor sólida vira branca — substitui o antigo dark:brightness-0 dark:invert sem regressão.
            Altura reduzida para caber no header h-14 (56px) sem cortar a imagem. */}
        <div
          role="img"
          aria-label="Alfabra Logo"
          className="h-[102px] aspect-[3856/2160] bg-primary dark:bg-white transition-colors duration-200"
          style={{
            WebkitMaskImage: 'url(/assets/images/LogoMarca_Alfabra.png)',
            maskImage: 'url(/assets/images/LogoMarca_Alfabra.png)',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
        />
        <span className="hidden sm:block h-5 w-[1px] bg-border-color" />
        <h1 className="hidden sm:block text-sm font-bold tracking-wider text-primary select-none heading-font uppercase">
          Delphos platform
        </h1>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        {/* Health Check Status Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs">
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
          <div className="flex items-center gap-2 md:gap-4 text-xs font-body">
            {/* User Profile */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary text-white font-bold flex items-center justify-center text-sm shadow-sm select-none flex-shrink-0">
                {getInitials(user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username)}
              </div>
              <div className="hidden sm:flex flex-col text-left">
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
          <Link href="/auth/login" className="btn-primary text-xs px-4 py-2 rounded">
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
};
