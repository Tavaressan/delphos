'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../providers/AuthProvider';
import { Terminal, Cpu, Database, CalendarClock, ChevronLeft, ChevronRight, X, Settings, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { ConversationList } from '../../features/chat/ConversationList';

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

  const alignClass = (extra = '') => collapsed ? `justify-center px-0 ${extra}` : `px-6 gap-3 ${extra}`;

  const linkBase = 'relative py-3.5 flex items-center text-sm font-semibold transition-colors duration-200 overflow-hidden';

  const NavLink = ({ href, icon: Icon, label, title }: { href: string; icon: React.ElementType; label: string; title: string }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        title={title}
        className={`${linkBase} ${alignClass()} ${active ? 'text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}
      >
        {active && (
          <motion.span
            layoutId="sidebar-active-bg"
            className="absolute inset-0 bg-primary border-l-4 border-accent"
            transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
          />
        )}
        <Icon className={`relative z-10 w-4 h-4 flex-shrink-0 ${active ? 'text-accent' : 'text-slate-400 dark:text-slate-500'}`} />
        {!collapsed && <span className="relative z-10">{label}</span>}
      </Link>
    );
  };

  const DisabledLink = ({ icon: Icon, label, title }: { icon: React.ElementType; label: string; title: string }) => (
    <div title={title} className={`${linkBase} ${alignClass()} text-slate-300 dark:text-slate-700 cursor-not-allowed select-none`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </div>
  );

  const isHome = pathname === '/';

  const sidebarContent = (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0 select-none transition-all duration-300 h-full`}>
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
            aria-label={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {isLogged ? (
          <>
            <NavLink href="/" icon={Terminal} label="Console de Agentes" title="Console de Agentes" />
            <NavLink href="/catalog" icon={Cpu} label="Catálogo de Agentes" title="Catálogo de Agentes" />
            <NavLink href="/knowledge-base" icon={Database} label="Bases de Conhecimento" title="Bases de Conhecimento" />
            <NavLink href="/schedule" icon={CalendarClock} label="Agendamentos" title="Agendamentos" />

            <hr className="mx-4 border-slate-200 dark:border-slate-800 my-1" />

            <NavLink href="/profile" icon={User} label="Meu Perfil" title="Perfil do Usuário" />
            <NavLink href="/settings" icon={Settings} label="Configurações" title="Configurações do Sistema" />
          </>
        ) : (
          <>
            <DisabledLink icon={Terminal} label="Console de Agentes" title="Console de Agentes (Bloqueado)" />
            <DisabledLink icon={Cpu} label="Catálogo de Agentes" title="Catálogo de Agentes (Bloqueado)" />
            <DisabledLink icon={Database} label="Bases de Conhecimento" title="Bases de Conhecimento (Bloqueado)" />
          </>
        )}
      </div>

      {/* Conversation history — only on home page, only expanded, only logged in */}
      {isLogged && !collapsed && isHome && (
        <div className="flex-1 min-h-0 border-t border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
          <ConversationList />
        </div>
      )}

      <div className="p-4 bg-slate-200 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1 font-mono text-center flex-shrink-0">
        {!collapsed ? (
          <div className="text-[9px] text-slate-400 dark:text-slate-600">ALFABRA SYSTEM V2.4.3</div>
        ) : (
          <div className="text-[9px] text-slate-400 dark:text-slate-600 font-bold">V2.4</div>
        )}
      </div>
    </aside>
  );

  // Mobile nav link (sem layoutId para evitar conflito com desktop)
  const MobileNavLink = ({ href, label, active }: { href: string; label: string; active: boolean }) => (
    <Link
      href={href}
      className={`px-6 gap-3 py-3.5 flex items-center text-sm font-semibold transition-all duration-200 ${active ? 'bg-primary text-white border-l-4 border-accent' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}
    >
      {label}
    </Link>
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
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
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
                      <Terminal className={`w-4 h-4 ${isActive('/') ? 'text-accent' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>Console de Agentes</span>
                    </Link>
                    <Link href="/catalog" className={`px-6 gap-3 py-3.5 flex items-center text-sm font-semibold transition-all duration-200 ${isActive('/catalog') ? 'bg-primary text-white border-l-4 border-accent' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                      <Cpu className={`w-4 h-4 ${isActive('/catalog') ? 'text-accent' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>Catálogo de Agentes</span>
                    </Link>
                    <Link href="/knowledge-base" className={`px-6 gap-3 py-3.5 flex items-center text-sm font-semibold transition-all duration-200 ${isActive('/knowledge-base') ? 'bg-primary text-white border-l-4 border-accent' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                      <Database className={`w-4 h-4 ${isActive('/knowledge-base') ? 'text-accent' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>Bases de Conhecimento</span>
                    </Link>
                    <Link href="/schedule" className={`px-6 gap-3 py-3.5 flex items-center text-sm font-semibold transition-all duration-200 ${isActive('/schedule') ? 'bg-primary text-white border-l-4 border-accent' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                      <CalendarClock className={`w-4 h-4 ${isActive('/schedule') ? 'text-accent' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>Agendamentos</span>
                    </Link>

                    <hr className="mx-4 border-slate-200 dark:border-slate-800 my-1" />

                    <Link href="/profile" className={`px-6 gap-3 py-3.5 flex items-center text-sm font-semibold transition-all duration-200 ${isActive('/profile') ? 'bg-primary text-white border-l-4 border-accent' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                      <User className={`w-4 h-4 ${isActive('/profile') ? 'text-accent' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>Meu Perfil</span>
                    </Link>
                    <Link href="/settings" className={`px-6 gap-3 py-3.5 flex items-center text-sm font-semibold transition-all duration-200 ${isActive('/settings') ? 'bg-primary text-white border-l-4 border-accent' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                      <Settings className={`w-4 h-4 ${isActive('/settings') ? 'text-accent' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>Configurações</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="px-6 gap-3 py-3.5 flex items-center text-sm font-semibold text-slate-300 dark:text-slate-700 cursor-not-allowed select-none">
                      <Terminal className="w-4 h-4" /><span>Console de Agentes</span>
                    </div>
                    <div className="px-6 gap-3 py-3.5 flex items-center text-sm font-semibold text-slate-300 dark:text-slate-700 cursor-not-allowed select-none">
                      <Cpu className="w-4 h-4" /><span>Catálogo de Agentes</span>
                    </div>
                    <div className="px-6 gap-3 py-3.5 flex items-center text-sm font-semibold text-slate-300 dark:text-slate-700 cursor-not-allowed select-none">
                      <Database className="w-4 h-4" /><span>Bases de Conhecimento</span>
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
