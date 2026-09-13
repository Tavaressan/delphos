'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Sidebar, Footer } from '../../components/layout';
import { useAuth } from '../../providers/AuthProvider';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { isLogged } = useAuth();
  const router = useRouter();

  // Guard de rota — issue #316: nenhuma tela de (main) pode ser alcançada sem
  // uma sessão autenticada. Visitantes sem login são redirecionados.
  useEffect(() => {
    if (!isLogged) {
      router.replace('/auth/login');
    }
  }, [isLogged, router]);

  if (!isLogged) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-slate-800 dark:text-text-primary">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        {children}
      </div>
      <Footer />
    </div>
  );
}
