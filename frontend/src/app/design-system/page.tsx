'use client';

import React from 'react';
import { Header, Sidebar, Footer } from '../../components/layout';
import { Button } from '../../components/ui';

export default function DesignSystemPage() {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-slate-800">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col min-h-0 font-body">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-wide text-slate-800 heading-font uppercase">Guia de Design System Tokens</h2>
            <p className="text-slate-400 text-xs mt-1">Mapeamento visual completo da identidade industrial e corporativa da Alfabra.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Color Palette Preview */}
            <div className="bg-white border border-slate-200 rounded shadow-discrete p-6 flex flex-col gap-4">
              <h3 className="font-bold text-slate-700 text-sm heading-font uppercase border-b border-slate-100 pb-2.5">Sistema de Cores</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Primary */}
                <div className="flex flex-col rounded border border-slate-150 overflow-hidden">
                  <div className="h-16 bg-primary" />
                  <div className="p-2.5 bg-slate-50 flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-700">Primary</span>
                    <span className="text-[10px] font-mono text-slate-400">#22409A</span>
                  </div>
                </div>

                {/* Secondary */}
                <div className="flex flex-col rounded border border-slate-150 overflow-hidden">
                  <div className="h-16 bg-[#E5E4E2] border-b border-slate-200" />
                  <div className="p-2.5 bg-slate-50 flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-700">Secondary</span>
                    <span className="text-[10px] font-mono text-slate-400">#E5E4E2</span>
                  </div>
                </div>

                {/* Accent */}
                <div className="flex flex-col rounded border border-slate-150 overflow-hidden">
                  <div className="h-16 bg-accent" />
                  <div className="p-2.5 bg-slate-50 flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-700">Accent</span>
                    <span className="text-[10px] font-mono text-slate-400">#00ACC1</span>
                  </div>
                </div>

                {/* Success */}
                <div className="flex flex-col rounded border border-slate-150 overflow-hidden">
                  <div className="h-16 bg-success" />
                  <div className="p-2.5 bg-slate-50 flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-700">Success</span>
                    <span className="text-[10px] font-mono text-slate-400">#2E7D32</span>
                  </div>
                </div>

                {/* Warning */}
                <div className="flex flex-col rounded border border-slate-150 overflow-hidden">
                  <div className="h-16 bg-warning" />
                  <div className="p-2.5 bg-slate-50 flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-700">Warning</span>
                    <span className="text-[10px] font-mono text-slate-400">#F9A825</span>
                  </div>
                </div>

                {/* Danger */}
                <div className="flex flex-col rounded border border-slate-150 overflow-hidden">
                  <div className="h-16 bg-danger" />
                  <div className="p-2.5 bg-slate-50 flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-700">Danger</span>
                    <span className="text-[10px] font-mono text-slate-400">#C62828</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="flex items-center justify-between p-3 bg-[#FBFBFE] rounded border border-slate-200">
                  <span className="text-xs font-bold text-slate-600">Background Fundo</span>
                  <span className="text-[11px] font-mono font-bold text-slate-500">#FBFBFE</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded border border-slate-200">
                  <span className="text-xs font-bold text-slate-600">Surface Cards</span>
                  <span className="text-[11px] font-mono font-bold text-slate-500">#FFFFFF</span>
                </div>
              </div>
            </div>

            {/* Typography Preview */}
            <div className="bg-white border border-slate-200 rounded shadow-discrete p-6 flex flex-col gap-4">
              <h3 className="font-bold text-slate-700 text-sm heading-font uppercase border-b border-slate-100 pb-2.5">Tipografia e Fontes</h3>
              
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-slate-50 border border-slate-150 rounded flex flex-col gap-1 text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Font Heading: Orbitron</span>
                  <span className="text-lg font-bold tracking-wider text-primary heading-font">ALFABRA ELEVADORES AUTOMATIZADOS</span>
                  <span className="text-xs text-slate-500 font-mono">Aplicado em títulos, marca e painéis de alto nível</span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-150 rounded flex flex-col gap-1.5 text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Font Body: Overpass</span>
                  <span className="text-sm text-slate-700 leading-relaxed font-body">
                    Este texto demonstra a legibilidade da fonte de corpo. O Overpass é ideal para tabelas de conformidade, preenchimento de formulários de auditoria e timelines de status dos agentes Crews.
                  </span>
                  <div className="flex gap-4 text-xs font-bold text-slate-500 font-mono mt-1">
                    <span>LIGHT: 200</span>
                    <span>REGULAR: 400</span>
                    <span>BOLD: 600</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Buttons and Forms components styling rules previews */}
            <div className="bg-white border border-slate-200 rounded shadow-discrete p-6 flex flex-col gap-4">
              <h3 className="font-bold text-slate-700 text-sm heading-font uppercase border-b border-slate-100 pb-2.5">Componentes de Botões</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Botão Primário</Button>
                <Button variant="secondary">Botão Secundário</Button>
                <Button variant="ghost">Botão Ghost</Button>
                <Button variant="danger">Botão Danger</Button>
              </div>
            </div>

            {/* Forms styling preview */}
            <div className="bg-white border border-slate-200 rounded shadow-discrete p-6 flex flex-col gap-4">
              <h3 className="font-bold text-slate-700 text-sm heading-font uppercase border-b border-slate-100 pb-2.5">Campos de Formulários</h3>
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
