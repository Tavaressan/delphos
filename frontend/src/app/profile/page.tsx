'use client';

import React from 'react';
import { Header, Sidebar, Footer } from '../../components/layout';
import { Badge } from '../../components/ui';
import { useAuth } from '../../providers/AuthProvider';
import { ShieldCheck, Building2, Calendar, Activity } from 'lucide-react';

const getInitials = (name?: string) => {
  if (!name) return 'US';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5 py-2 border-b border-border-color last:border-b-0">
    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-mono">{label}</span>
    <span className="text-sm text-text-primary font-semibold">{value}</span>
  </div>
);

export default function ProfilePage() {
  const { user } = useAuth();

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user?.username ?? 'Usuário';

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-text-primary transition-colors duration-200">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background/50 p-6 flex flex-col min-h-0 font-body transition-colors duration-200">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-wide text-text-primary heading-font uppercase">Meu Perfil</h2>
            <p className="text-text-secondary text-xs mt-1">Informações da sua conta e acesso no sistema.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-4xl">

            {/* Avatar + identidade */}
            <div className="card-alfabra flex flex-col items-center gap-4 xl:col-span-1">
              <div className="w-20 h-20 rounded-full bg-primary text-white font-bold flex items-center justify-center text-2xl shadow-md select-none">
                {getInitials(displayName)}
              </div>
              <div className="text-center">
                <p className="font-bold text-text-primary text-base">{displayName}</p>
                <p className="text-xs text-text-secondary font-mono mt-0.5">{user?.username ?? '—'}</p>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <Badge variant="primary" className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> ROLE_ADMIN
                </Badge>
                <Badge variant="secondary">
                  Alfabra Elevadores — Matriz
                </Badge>
              </div>
              <div className="w-full pt-2 border-t border-border-color text-center">
                <Badge variant="accent">Em breve — editar perfil</Badge>
              </div>
            </div>

            {/* Dados pessoais + acesso */}
            <div className="xl:col-span-2 flex flex-col gap-6">

              <div className="card-alfabra">
                <div className="flex items-center gap-2 border-b border-border-color pb-3 mb-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-text-primary text-sm heading-font uppercase">Dados de Acesso</h3>
                </div>
                <InfoRow label="Nome completo" value={displayName} />
                <InfoRow label="Usuário" value={user?.username ?? '—'} />
                <InfoRow label="Papel (Role)" value={
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" /> ROLE_ADMIN
                  </span>
                } />
                <InfoRow label="Tenant / Organização" value="Alfabra Elevadores — Matriz" />
              </div>

              <div className="card-alfabra">
                <div className="flex items-center gap-2 border-b border-border-color pb-3 mb-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-text-primary text-sm heading-font uppercase">Atividade Recente</h3>
                </div>
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                  <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                  <p className="text-sm text-text-secondary">Histórico de execuções disponível em breve.</p>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
