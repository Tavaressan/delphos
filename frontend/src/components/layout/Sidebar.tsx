'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../providers/AuthProvider';
import { Terminal, Cpu, Database, ChevronLeft, ChevronRight, X } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isLogged } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    setCollapsed(isCollapsed);
  }, []);

  useEffect(() => {
    const handleMobileOpen = () => setMobileOpen(true);
    window.addEventListener('mobile-sidebar-open', handleMobileOpen);
    return () => window.removeEventListener('mobile-sidebar-open', handleMobileOpen);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapse = () => {
    const nextCollapsed = !collapsed;
    setCollapsed(nextCollapsed);
    localStorage.setItem('sidebar_collapsed', String(nextCollapsed));
    window.dispatchEvent(new Event('sidebar-toggle'));
  };

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const linkClass = (path: string, disabled: boolean = false) => {
    const active = isActive(path);
    const alignClass = collapsed ? 'justify-center px-0' : 'px-6 gap-3';
    if (disabled) {
      return `${alignClass} py-3.5 flex items-center text-sm font-semibold transition-all duration-200 text-slate-300 dark:text-slate-700 cursor-not-allowed select-none`;
    }
    return `${alignClass} py-3.5 flex items-center text-sm font-semibold transition-all duration-200 ${
      active
        ? 'bg-primary text-white border-l-4 border-accent'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/50'
    }`;
  };

  const iconColor = (path: string) => {
    return isActive(path) ? 'text-accent' : 'text-slate-400 dark:text-slate-500';
  };

  const sidebarContent = (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0 justify-between select-none transition-all duration-300 h-full`}>
      <div className="py-6 flex flex-col gap-1.5 font-body">

        {/* Toggle & Title Area */}
        <div className={`px-6 mb-4 flex items-center ${collapsed ? 'justify-center px-0' : 'justify-between'}`}>
          {!collapsed && (
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest heading-font">
              Módulos Operacionais
            </span>
          )}
          <button
            onClick={toggleCollapse}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
            aria-label={collapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {isLogged ? (
          <>
            <Link href="/" className={linkClass('/')} title="Console de Agentes">
              <Terminal className={`w-4.5 h-4.5 ${iconColor('/')}`} />
              {!collapsed && <span>Console de Agentes</span>}
            </Link>

            <Link href="/catalog" className={linkClass('/catalog')} title="Catálogo de Agentes">
              <Cpu className={`w-4.5 h-4.5 ${iconColor('/catalog')}`} />
              {!collapsed && <span>Catálogo de Agentes</span>}
            </Link>

            <Link href="/knowledge-base" className={linkClass('/knowledge-base')} title="Bases de Conhecimento">
              <Database className={`w-4.5 h-4.5 ${iconColor('/knowledge-base')}`} />
              {!collapsed && <span>Bases de Conhecimento</span>}
            </Link>
          </>
        ) : (
          <>
            <div className={linkClass('/', true)} title="Console de Agentes (Bloqueado)">
              <Terminal className="w-4.5 h-4.5 text-slate-300 dark:text-slate-700" />
              {!collapsed && <span>Console de Agentes</span>}
            </div>

            <div className={linkClass('/catalog', true)} title="Catálogo de Agentes (Bloqueado)">
              <Cpu className="w-4.5 h-4.5 text-slate-300 dark:text-slate-700" />
              {!collapsed && <span>Catálogo de Agentes</span>}
            </div>

            <div className={linkClass('/knowledge-base', true)} title="Bases de Conhecimento (Bloqueado)">
              <Database className="w-4.5 h-4.5 text-slate-300 dark:text-slate-700" />
              {!collapsed && <span>Bases de Conhecimento</span>}
            </div>
          </>
        )}
      </div>

      <div className="p-4 bg-slate-200 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1 font-mono text-center">
        {!collapsed ? (
          <div className="text-[9px] text-slate-400 dark:text-slate-600">ALFABRA SYSTEM V2.4.3</div>
        ) : (
          <div className="text-[9px] text-slate-400 dark:text-slate-600 font-bold">V2.4</div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: inline sidebar */}
      <div className="hidden md:flex h-full">
        {sidebarContent}
      </div>

      {/* Mobile: overlay drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="relative flex h-full w-64 flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 z-10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              aria-label="Fechar menu"
            >
              <X className="w-4 h-4" />
            </button>
            <aside className="w-64 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0 justify-between select-none h-full">
              <div className="py-6 flex flex-col gap-1.5 font-body">
                <div className="px-6 mb-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest heading-font">
                    Módulos Operacionais
                  </span>
                </div>

                {isLogged ? (
                  <>
                    <Link href="/" className={`px-6 gap-3 py-3.5 flex items-center text-sm font-semibold transition-all duration-200 ${isActive('/') ? 'bg-primary text-white border-l-4 border-accent' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                      <Terminal className={`w-4.5 h-4.5 ${isActive('/') ? 'text-accent' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>Console de Agentes</span>
                    </Link>
                    <Link href="/catalog" className={`px-6 gap-3 py-3.5 flex items-center text-sm font-semibold transition-all duration-200 ${isActive('/catalog') ? 'bg-primary text-white border-l-4 border-accent' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                      <Cpu className={`w-4.5 h-4.5 ${isActive('/catalog') ? 'text-accent' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>Catálogo de Agentes</span>
                    </Link>
                    <Link href="/knowledge-base" className={`px-6 gap-3 py-3.5 flex items-center text-sm font-semibold transition-all duration-200 ${isActive('/knowledge-base') ? 'bg-primary text-white border-l-4 border-accent' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                      <Database className={`w-4.5 h-4.5 ${isActive('/knowledge-base') ? 'text-accent' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>Bases de Conhecimento</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="px-6 gap-3 py-3.5 flex items-center text-sm font-semibold text-slate-300 dark:text-slate-700 cursor-not-allowed select-none">
                      <Terminal className="w-4.5 h-4.5 text-slate-300 dark:text-slate-700" /><span>Console de Agentes</span>
                    </div>
                    <div className="px-6 gap-3 py-3.5 flex items-center text-sm font-semibold text-slate-300 dark:text-slate-700 cursor-not-allowed select-none">
                      <Cpu className="w-4.5 h-4.5 text-slate-300 dark:text-slate-700" /><span>Catálogo de Agentes</span>
                    </div>
                    <div className="px-6 gap-3 py-3.5 flex items-center text-sm font-semibold text-slate-300 dark:text-slate-700 cursor-not-allowed select-none">
                      <Database className="w-4.5 h-4.5 text-slate-300 dark:text-slate-700" /><span>Bases de Conhecimento</span>
                    </div>
                  </>
                )}
              </div>
              <div className="p-4 bg-slate-200 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 font-mono text-center">
                <div className="text-[9px] text-slate-400 dark:text-slate-600">ALFABRA SYSTEM V2.4.3</div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
};
