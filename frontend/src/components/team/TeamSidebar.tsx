'use client';

import React from 'react';
import { Bot } from 'lucide-react';
import { Agent } from '../../domain/entities';

export interface TeamSidebarProps {
  agents: Agent[];
  activeAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  title?: string;
  emptyMessage?: string;
}

/**
 * Sidebar que lista os agentes da equipe/workspace atual, permitindo trocar
 * rapidamente qual agente está ativo na conversa (issue #144). Componente
 * controlado: quem gerencia o agente ativo é o consumidor, via
 * `activeAgentId` + `onSelectAgent`.
 */
export const TeamSidebar: React.FC<TeamSidebarProps> = ({
  agents,
  activeAgentId,
  onSelectAgent,
  title = 'Equipe',
  emptyMessage = 'Nenhum agente nesta equipe.',
}) => {
  return (
    <div data-testid="team-sidebar" className="flex flex-col gap-1">
      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider heading-font">
        {title}
      </span>

      {agents.length === 0 ? (
        <p data-testid="team-sidebar-empty" className="text-xs text-text-secondary">
          {emptyMessage}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {agents.map((agent) => {
            const active = agent.id === activeAgentId;
            return (
              <li key={agent.id}>
                <button
                  type="button"
                  data-testid={`team-agent-${agent.id}`}
                  data-active={active}
                  onClick={() => onSelectAgent(agent.id)}
                  className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{agent.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
