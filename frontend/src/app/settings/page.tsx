'use client';

import React from 'react';
import { Header, Sidebar, Footer } from '../../components/layout';
import { Badge } from '../../components/ui';
import { Palette, Bell, Link2, ShieldCheck } from 'lucide-react';

const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div className="card-alfabra flex flex-col gap-4">
    <div className="flex items-center gap-2 border-b border-border-color pb-3">
      <Icon className="w-4 h-4 text-primary" />
      <h3 className="font-bold text-text-primary text-sm heading-font uppercase">{title}</h3>
    </div>
    {children}
  </div>
);

const SettingRow = ({ label, description }: { label: string; description: string }) => (
  <div className="flex items-center justify-between py-1">
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-semibold text-text-primary">{label}</span>
      <span className="text-xs text-text-secondary">{description}</span>
    </div>
    <Badge variant="secondary">Em breve</Badge>
  </div>
);

export default function SettingsPage() {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-text-primary transition-colors duration-200">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background/50 p-6 flex flex-col min-h-0 font-body transition-colors duration-200">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-wide text-text-primary heading-font uppercase">Configurações</h2>
            <p className="text-text-secondary text-xs mt-1">Preferências e configurações do sistema Alfabra Vector.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-4xl">

            <Section icon={Palette} title="Aparência">
              <SettingRow label="Tema" description="Alternar entre modo claro e escuro (disponível no header)" />
              <SettingRow label="Idioma" description="Selecionar idioma da interface (pt-BR / en-US)" />
              <SettingRow label="Densidade" description="Compacto, normal ou espaçado" />
            </Section>

            <Section icon={Bell} title="Notificações">
              <SettingRow label="Alertas de agentes" description="Notificar quando uma execução terminar ou falhar" />
              <SettingRow label="Ingestão de documentos" description="Notificar ao concluir indexação de documentos" />
              <SettingRow label="Atualizações do sistema" description="Receber avisos de manutenção e novidades" />
            </Section>

            <Section icon={Link2} title="Integração">
              <div className="flex flex-col gap-1">
                <label className="label-alfabra">URL do Backend</label>
                <input
                  type="text"
                  className="input-alfabra opacity-60 cursor-not-allowed"
                  value={process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'}
                  readOnly
                  disabled
                />
                <span className="text-[10px] text-text-secondary font-mono mt-0.5">Configurado via variável de ambiente</span>
              </div>
              <SettingRow label="Timeout de requisições" description="Tempo máximo de espera por resposta da API (ms)" />
            </Section>

            <Section icon={ShieldCheck} title="Segurança">
              <SettingRow label="Alterar senha" description="Redefinir senha da conta atual" />
              <SettingRow label="Sessões ativas" description="Visualizar e encerrar sessões em outros dispositivos" />
              <SettingRow label="Autenticação em dois fatores" description="Ativar ou configurar MFA para sua conta" />
            </Section>

          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
