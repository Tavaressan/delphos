'use client';

import React from 'react';
import { validateCronExpression, describeCronExpression } from '../cronUtils';

export interface ScheduleAgentOption {
  id: string;
  name: string;
}

export interface CreateScheduleDialogProps {
  isOpen: boolean;
  agents: ScheduleAgentOption[];
  agentId: string;
  cronExpression: string;
  prompt: string;
  submitting?: boolean;
  submitError?: string | null;
  onAgentChange: (agentId: string) => void;
  onCronChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

// Componente controlado (sem estado interno) para permitir teste de renderização estática
// da validação de cron sem depender de simulação de eventos de DOM.
export const CreateScheduleDialog: React.FC<CreateScheduleDialogProps> = ({
  isOpen,
  agents,
  agentId,
  cronExpression,
  prompt,
  submitting = false,
  submitError = null,
  onAgentChange,
  onCronChange,
  onPromptChange,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  const cronError = cronExpression.trim() ? validateCronExpression(cronExpression) : null;
  const cronDescription = !cronError && cronExpression.trim() ? describeCronExpression(cronExpression) : null;
  const canSubmit = !cronError && cronExpression.trim() !== '' && prompt.trim() !== '' && agentId !== '' && !submitting;

  return (
    <div role="dialog" aria-label="Novo agendamento" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="card-alfabra w-full max-w-md flex flex-col gap-4">
        <h3 className="font-bold text-text-primary text-base heading-font uppercase">Novo Agendamento</h3>

        <label className="text-xs text-text-secondary flex flex-col gap-1">
          Agente
          <select
            className="bg-secondary/20 border border-border-color rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
            value={agentId}
            onChange={e => onAgentChange(e.target.value)}
          >
            <option value="">Selecione um agente</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
        </label>

        <label className="text-xs text-text-secondary flex flex-col gap-1">
          Expressão cron
          <input
            type="text"
            className="bg-secondary/20 border border-border-color rounded px-2 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-primary"
            placeholder="0 9 * * 1"
            value={cronExpression}
            onChange={e => onCronChange(e.target.value)}
          />
        </label>

        {cronError && (
          <p data-testid="cron-error" className="text-[11px] text-danger">{cronError}</p>
        )}
        {cronDescription && (
          <p data-testid="cron-description" className="text-[11px] text-text-secondary">{cronDescription}</p>
        )}

        <label className="text-xs text-text-secondary flex flex-col gap-1">
          Prompt do agente
          <textarea
            className="bg-secondary/20 border border-border-color rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
            rows={3}
            value={prompt}
            onChange={e => onPromptChange(e.target.value)}
            placeholder="Instrução a ser enviada ao agente em cada execução"
          />
        </label>

        {submitError && (
          <p data-testid="submit-error" className="text-[11px] text-danger">{submitError}</p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border-color pt-3">
          <button
            onClick={onClose}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-text-secondary text-xs font-bold py-1.5 px-3 rounded border border-border-color transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="bg-primary hover:bg-primary-dark text-white text-xs font-bold py-1.5 px-3 rounded transition-colors disabled:opacity-50"
          >
            {submitting ? 'Criando...' : 'Criar agendamento'}
          </button>
        </div>
      </div>
    </div>
  );
};
