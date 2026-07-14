'use client';

import React from 'react';
import { LayoutPanelLeft } from 'lucide-react';

export interface PanelEmptyProps {
  message?: string;
}

/**
 * Placeholder exibido pelo PanelDock quando nenhum painel está aberto
 * (issue #146).
 */
export const PanelEmpty: React.FC<PanelEmptyProps> = ({
  message = 'Nenhum painel aberto. Abra um painel para começar.',
}) => {
  return (
    <div
      data-testid="panel-empty"
      className="flex flex-1 flex-col items-center justify-center gap-2 text-text-secondary"
    >
      <LayoutPanelLeft className="w-6 h-6 opacity-50" />
      <p className="text-xs">{message}</p>
    </div>
  );
};
