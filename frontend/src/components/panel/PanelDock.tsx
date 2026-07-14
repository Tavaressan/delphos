'use client';

import React from 'react';
import { X } from 'lucide-react';
import { PanelEmpty } from './PanelEmpty';

export interface DockPanel {
  id: string;
  title: string;
  content: React.ReactNode;
}

export interface PanelDockProps {
  panels: DockPanel[];
  onClosePanel: (panelId: string) => void;
  emptyMessage?: string;
}

/**
 * Contêiner de docking que permite manter múltiplos painéis (base de
 * conhecimento, MCP/Skills, tarefas, permissões/HITL) abertos lado a lado,
 * cada um fechável individualmente (issue #146). Componente controlado: quem
 * gerencia a lista de painéis abertos é o consumidor, via `panels` +
 * `onClosePanel`.
 */
export const PanelDock: React.FC<PanelDockProps> = ({ panels, onClosePanel, emptyMessage }) => {
  if (panels.length === 0) {
    return <PanelEmpty message={emptyMessage} />;
  }

  return (
    <div data-testid="panel-dock" className="flex h-full w-full gap-3 overflow-x-auto">
      {panels.map((panel) => (
        <div
          key={panel.id}
          data-testid={`panel-${panel.id}`}
          className="flex flex-col min-w-[280px] flex-1 border border-border-color rounded bg-surface"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border-color">
            <span className="text-xs font-bold text-text-primary uppercase tracking-wider heading-font truncate">
              {panel.title}
            </span>
            <button
              type="button"
              data-testid={`panel-close-${panel.id}`}
              onClick={() => onClosePanel(panel.id)}
              aria-label={`Fechar ${panel.title}`}
              className="text-text-secondary hover:text-text-primary flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto p-3">{panel.content}</div>
        </div>
      ))}
    </div>
  );
};
