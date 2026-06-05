'use client';

import React from 'react';
import { Header, Sidebar, Footer } from '../components/layout';
import { ChatCanvas } from '../features/chat/ChatCanvas';
import { useAuth } from '../providers/AuthProvider';

export default function Home() {
  const { isLogged } = useAuth();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-slate-800">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-0 bg-slate-50">
          <ChatCanvas />
        </main>
      </div>
      <Footer />
    </div>
  );
}
