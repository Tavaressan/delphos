'use client';

import React from 'react';
import { Header, Sidebar, Footer } from '../../components/layout';
import { Button } from '../../components/ui';

export default function DesignSystemPage() {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-text-primary transition-colors duration-200">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background/50 p-6 flex flex-col min-h-0 font-body transition-colors duration-200">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-wide text-text-primary heading-font uppercase">Guia de Design System Tokens</h2>
            <p className="text-text-secondary text-xs mt-1">Mapeamento visual completo da identidade industrial e corporativa da Alfabra.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Color Palette Preview */}
            <div className="bg-surface border border-border-color rounded shadow-discrete p-6 flex flex-col gap-4 transition-colors duration-200">
              <h3 className="font-bold text-text-primary text-sm heading-font uppercase border-b border-border-color pb-2.5">Sistema de Cores</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Primary */}
                <div className="flex flex-col rounded border border-border-color overflow-hidden">
                  <div className="h-16 bg-primary" />
                  <div className="p-2.5 bg-secondary/30 dark:bg-slate-900/40 flex flex-col text-left">
                    <span className="text-xs font-bold text-text-primary">Primary</span>
                    <span className="text-[10px] font-mono text-text-secondary">var(--primary)</span>
                  </div>
                </div>

                {/* Secondary */}
                <div className="flex flex-col rounded border border-border-color overflow-hidden">
                  <div className="h-16 bg-secondary" />
                  <div className="p-2.5 bg-secondary/30 dark:bg-slate-900/40 flex flex-col text-left">
                    <span className="text-xs font-bold text-text-primary">Secondary</span>
                    <span className="text-[10px] font-mono text-text-secondary">var(--secondary)</span>
                  </div>
                </div>

                {/* Accent */}
                <div className="flex flex-col rounded border border-border-color overflow-hidden">
                  <div className="h-16 bg-accent" />
                  <div className="p-2.5 bg-secondary/30 dark:bg-slate-900/40 flex flex-col text-left">
                    <span className="text-xs font-bold text-text-primary">Accent</span>
                    <span className="text-[10px] font-mono text-text-secondary">var(--accent)</span>
                  </div>
                </div>

                {/* Success */}
                <div className="flex flex-col rounded border border-border-color overflow-hidden">
                  <div className="h-16 bg-success" />
                  <div className="p-2.5 bg-secondary/30 dark:bg-slate-900/40 flex flex-col text-left">
                    <span className="text-xs font-bold text-text-primary">Success</span>
                    <span className="text-[10px] font-mono text-text-secondary">var(--success)</span>
                  </div>
                </div>

                {/* Warning */}
                <div className="flex flex-col rounded border border-border-color overflow-hidden">
                  <div className="h-16 bg-warning" />
                  <div className="p-2.5 bg-secondary/30 dark:bg-slate-900/40 flex flex-col text-left">
                    <span className="text-xs font-bold text-text-primary">Warning</span>
                    <span className="text-[10px] font-mono text-text-secondary">var(--warning)</span>
                  </div>
                </div>

                {/* Danger */}
                <div className="flex flex-col rounded border border-border-color overflow-hidden">
                  <div className="h-16 bg-danger" />
                  <div className="p-2.5 bg-secondary/30 dark:bg-slate-900/40 flex flex-col text-left">
                    <span className="text-xs font-bold text-text-primary">Danger</span>
                    <span className="text-[10px] font-mono text-text-secondary">var(--danger)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="flex items-center justify-between p-3 bg-background rounded border border-border-color">
                  <span className="text-xs font-bold text-text-secondary">Background Fundo</span>
                  <span className="text-[11px] font-mono font-bold text-text-secondary">var(--background)</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface rounded border border-border-color">
                  <span className="text-xs font-bold text-text-secondary">Surface Cards</span>
                  <span className="text-[11px] font-mono font-bold text-text-secondary">var(--surface)</span>
                </div>
              </div>
            </div>

            {/* Typography Preview */}
            <div className="bg-surface border border-border-color rounded shadow-discrete p-6 flex flex-col gap-4 transition-colors duration-200">
              <h3 className="font-bold text-text-primary text-sm heading-font uppercase border-b border-border-color pb-2.5">Tipografia e Fontes</h3>
              
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-secondary/20 dark:bg-slate-900/40 border border-border-color rounded flex flex-col gap-1 text-left">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-mono">Font Heading: Inter</span>
                  <span className="text-lg font-bold tracking-wider text-primary heading-font">ALFABRA ELEVADORES AUTOMATIZADOS</span>
                  <span className="text-xs text-text-secondary font-mono">Aplicado em títulos, marca e painéis de alto nível</span>
                </div>

                <div className="p-4 bg-secondary/20 dark:bg-slate-900/40 border border-border-color rounded flex flex-col gap-1.5 text-left">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-mono">Font Body: Inter</span>
                  <span className="text-sm text-text-primary leading-relaxed font-body">
                    Este texto demonstra a legibilidade da fonte de corpo. A fonte Inter é limpa, moderna e ideal para tabelas de conformidade, preenchimento de formulários de auditoria e timelines de status dos agentes Crews.
                  </span>
                  <div className="flex gap-4 text-xs font-bold text-text-secondary font-mono mt-1">
                    <span>LIGHT: 200</span>
                    <span>REGULAR: 400</span>
                    <span>BOLD: 600</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Buttons and Forms components styling rules previews */}
            <div className="bg-surface border border-border-color rounded shadow-discrete p-6 flex flex-col gap-4 transition-colors duration-200">
              <h3 className="font-bold text-text-primary text-sm heading-font uppercase border-b border-border-color pb-2.5">Componentes de Botões</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Botão Primário</Button>
                <Button variant="secondary">Botão Secundário</Button>
                <Button variant="ghost">Botão Ghost</Button>
                <Button variant="danger">Botão Danger</Button>
              </div>
            </div>

            {/* Forms styling preview */}
            <div className="bg-surface border border-border-color rounded shadow-discrete p-6 flex flex-col gap-4 transition-colors duration-200">
              <h3 className="font-bold text-text-primary text-sm heading-font uppercase border-b border-border-color pb-2.5">Campos de Formulários</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div>
                  <label className="label-alfabra">Input em foco / ativo</label>
                  <input type="text" className="input-alfabra" defaultValue="Foco no input..." />
                </div>
                <div>
                  <label className="label-alfabra flex justify-between">
                    <span>Input com Erro</span>
                    <span className="text-danger font-bold text-[9px] lowercase font-mono">Campo obrigatório</span>
                  </label>
                  <input type="text" className="input-alfabra border-danger focus:ring-danger" placeholder="Preencha o campo..." />
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
