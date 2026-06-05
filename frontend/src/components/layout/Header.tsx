'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { ChevronDown, ShieldCheck, LogOut, Activity } from 'lucide-react';
import { apiClient } from '../../infrastructure/api/apiClient';

export const Header: React.FC = () => {
  const { user, isLogged, tenantId, logout } = useAuth();
  const [tenant, setTenant] = useState<string>('Alfabra Elevadores - Matriz');
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);

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
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shadow-sm flex-shrink-0">
      <div className="flex items-center gap-3">
        <img src="/assets/images/LogoMarca_Alfabra.png" alt="Alfabra Logo" className="h-8 object-contain" />
        <span className="h-5 w-[1px] bg-slate-200" />
        <h1 className="text-sm font-bold tracking-wider text-primary select-none heading-font uppercase">
          Enterprise Agent Operating Platform
        </h1>
      </div>

      <div className="flex items-center gap-6">
        {/* Health Check Status Indicator */}
        <div className="flex items-center gap-1.5 text-xs">
          <Activity className={`w-4 h-4 ${isBackendOnline === true ? 'text-success' : isBackendOnline === false ? 'text-danger' : 'text-slate-400'}`} />
          <span className="font-mono text-[10px] uppercase font-bold text-slate-500">
            Backend: {isBackendOnline === true ? (
              <span className="text-success">Online</span>
            ) : isBackendOnline === false ? (
              <span className="text-danger">Offline</span>
            ) : (
              <span className="text-slate-400">Verificando...</span>
            )}
          </span>
        </div>

        {isLogged && user ? (
          <div className="flex items-center gap-4 text-xs font-body">
            {/* Tenant Selection */}
            <div className="relative flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 cursor-pointer group hover:bg-slate-100 transition-all duration-150">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="font-semibold text-slate-600">{tenant}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
              
              <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded shadow-lg hidden group-hover:block w-52 overflow-hidden z-20">
                <div onClick={() => setTenant('Alfabra Elevadores - Matriz')} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-slate-700">Alfabra Elevadores - Matriz</div>
                <div onClick={() => setTenant('Alfabra Infra - Global')} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-slate-700">Alfabra Infra - Global</div>
              </div>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary text-white font-bold flex items-center justify-center text-sm shadow-sm select-none">
                {getInitials(user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username)}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-slate-700">{user.firstName} {user.lastName}</span>
                <span className="text-[10px] uppercase bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-mono font-bold border border-slate-200 flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5 text-primary" /> ROLE_ADMIN
                </span>
              </div>
            </div>

            <button onClick={logout} className="text-slate-400 hover:text-danger hover:bg-red-50 p-1.5 rounded transition-all duration-200">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-xs">
            <span className="text-slate-400">Acesso Restrito</span>
          </div>
        )}
      </div>
    </header>
  );
};
