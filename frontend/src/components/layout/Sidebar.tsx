'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../providers/AuthProvider';
import { Terminal, Cpu, Database, Layers, Wrench } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isLogged } = useAuth();

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const linkClass = (path: string, disabled: boolean = false) => {
    if (disabled) {
      return 'px-6 py-3.5 flex items-center gap-3 text-sm font-semibold transition-all duration-200 text-slate-700 cursor-not-allowed select-none';
    }
    const active = isActive(path);
    return `px-6 py-3.5 flex items-center gap-3 text-sm font-semibold transition-all duration-200 ${
      active
        ? 'bg-primary text-white border-l-4 border-accent'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
    }`;
  };

  const iconColor = (path: string) => {
    return isActive(path) ? 'text-accent' : 'text-slate-500';
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 justify-between select-none">
      <div className="py-6 flex flex-col gap-1.5 font-body">
        <div className="px-6 mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest heading-font">
          Módulos Operacionais
        </div>

        {isLogged ? (
          <>
            <Link href="/" className={linkClass('/')}>
              <Terminal className={`w-4.5 h-4.5 ${iconColor('/')}`} />
              <span>Console de Agentes</span>
            </Link>

            <Link href="/catalog" className={linkClass('/catalog')}>
              <Cpu className={`w-4.5 h-4.5 ${iconColor('/catalog')}`} />
              <span>Catálogo de Agentes</span>
            </Link>

            <Link href="/knowledge-base" className={linkClass('/knowledge-base')}>
              <Database className={`w-4.5 h-4.5 ${iconColor('/knowledge-base')}`} />
              <span>Bases de Conhecimento</span>
            </Link>
          </>
        ) : (
          <>
            <div className={linkClass('/', true)}>
              <Terminal className="w-4.5 h-4.5 text-slate-700" />
              <span>Console de Agentes (Bloqueado)</span>
            </div>

            <div className={linkClass('/catalog', true)}>
              <Cpu className="w-4.5 h-4.5 text-slate-700" />
              <span>Catálogo de Agentes (Bloqueado)</span>
            </div>

            <div className={linkClass('/knowledge-base', true)}>
              <Database className="w-4.5 h-4.5 text-slate-700" />
              <span>Bases de Conhecimento (Bloqueado)</span>
            </div>
          </>
        )}

        <div className="h-[1px] bg-slate-800 my-4 mx-6" />

        <div className="px-6 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest heading-font">
          Configurações Gerais
        </div>

        <Link href="/design-system" className={linkClass('/design-system')}>
          <Layers className={`w-4.5 h-4.5 ${iconColor('/design-system')}`} />
          <span>Design System Tokens</span>
        </Link>

        <Link href="/auth/login" className={linkClass('/auth/login')}>
          <Wrench className={`w-4.5 h-4.5 ${iconColor('/auth/login')}`} />
          <span>Simular Tela de Login</span>
        </Link>
      </div>

      {/* Sidebar footer showing branding status */}
      <div className="p-6 bg-slate-950 border-t border-slate-800 flex flex-col gap-2 font-mono">
        <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          Confiabilidade: 100%
        </div>
        <div className="text-[9px] text-slate-600">
          ALFABRA SYSTEM V2.4.3
        </div>
      </div>
    </aside>
  );
};
