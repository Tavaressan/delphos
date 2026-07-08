'use client';

import React from 'react';
import { CheckCircle2, Loader2, XCircle, Circle } from 'lucide-react';

/**
 * Status possíveis de uma tarefa/subtarefa exibida no TaskPanel.
 * Mapeados a partir do estado de execução do agente (ver useExecution.ts).
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface Task {
  id: string | number;
  name: string;
  status: TaskStatus;
  detail?: string;
}

export interface TaskPanelProps {
  tasks: Task[];
  title?: string;
  emptyMessage?: string;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; badgeClass: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pendente',
    badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    icon: <Circle className="w-3.5 h-3.5" />,
  },
  in_progress: {
    label: 'Em progresso',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  },
  completed: {
    label: 'Concluída',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  failed: {
    label: 'Falha',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

/**
 * Painel lateral simples que lista as tarefas/subtarefas de uma execução de
 * agente, com status em tempo real (pendente, em progresso, concluída, falha).
 *
 * Não é um sistema de layout dockável — isso é escopo da issue #146.
 */
export const TaskPanel: React.FC<TaskPanelProps> = ({
  tasks,
  title = 'Tarefas da Execução',
  emptyMessage = 'Nenhuma tarefa em andamento.',
}) => {
  return (
    <div data-testid="task-panel" className="flex flex-col gap-3">
      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider heading-font">
        {title}
      </span>

      {tasks.length === 0 ? (
        <p data-testid="task-panel-empty" className="text-xs text-text-secondary">
          {emptyMessage}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => {
            const config = STATUS_CONFIG[task.status];
            return (
              <li
                key={task.id}
                data-testid={`task-item-${task.id}`}
                data-status={task.status}
                className="flex items-center justify-between gap-2 text-xs border border-border-color rounded p-2"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-text-primary truncate">{task.name}</span>
                  {task.detail && (
                    <span className="text-[11px] text-text-secondary truncate">{task.detail}</span>
                  )}
                </div>
                <span
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${config.badgeClass}`}
                >
                  {config.icon}
                  {config.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
