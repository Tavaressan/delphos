'use client';

import React from 'react';
import { ChatCanvas } from '../../features/chat/ChatCanvas';
import { useAuth } from '../../providers/AuthProvider';

export default function Home() {
  const { isLogged } = useAuth();

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-slate-50">
      <ChatCanvas />
    </main>
  );
}
