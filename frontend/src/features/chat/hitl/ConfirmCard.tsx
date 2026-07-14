'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { SensitiveAction } from './types';

export interface ConfirmCardProps {
  action: SensitiveAction;
  onApprove: () => void;
  onReject: () => void;
}

/**
 * Cartão de confirmação bloqueante exibido quando um agente solicita
 * uma ação sensível. A execução deve permanecer pausada (do ponto de vista
 * de quem consome este componente) até o usuário aprovar ou rejeitar.
 */
export const ConfirmCard: React.FC<ConfirmCardProps> = ({ action, onApprove, onReject }) => {
  return (
    <div
      role="alertdialog"
      aria-label="Confirmação de ação sensível"
      className="border border-warning/50 bg-warning/10 rounded-lg p-3.5 text-xs flex flex-col gap-2.5 mr-auto max-w-[85%]"
    >
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-warning flex-shrink-0" />
        <span className="font-bold text-text-primary">
          {action.agentName} solicita permissão para: {action.actionLabel}
        </span>
      </div>

      {action.description && (
        <p className="text-text-secondary leading-relaxed">{action.description}</p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          aria-label="Rejeitar ação"
          onClick={onReject}
          className="px-3 py-1.5 rounded border border-border-color text-text-secondary hover:text-danger hover:border-danger transition-colors font-semibold"
        >
          Rejeitar
        </button>
        <button
          type="button"
          aria-label="Aprovar ação"
          onClick={onApprove}
          className="px-3 py-1.5 rounded bg-primary text-white hover:opacity-90 transition-opacity font-semibold"
        >
          Aprovar
        </button>
      </div>
    </div>
  );
};
