import React from 'react';
import { Header, Sidebar, Footer } from '../../components/layout';

export default function MainLayout({ children }: { children: React.ReactNode }) {
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
