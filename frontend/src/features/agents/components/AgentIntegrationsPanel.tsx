import React, { useState } from 'react';
import { X } from 'lucide-react';
import { McpServerConfig, AgentSkill } from '../../../domain/entities';
import { McpPanel } from './McpPanel';
import { SkillPanel } from './SkillPanel';

export interface AgentIntegrationsPanelProps {
  agentName: string;
  initialMcpConfigs?: McpServerConfig[];
  initialSkills?: AgentSkill[];
  onClose: () => void;
}

/**
 * Painel simples (não dockável — fora do escopo da issue #146) para configurar
 * servidores MCP e skills customizadas de um agente. Renderizado como modal a
 * partir da listagem de agentes.
 */
export const AgentIntegrationsPanel: React.FC<AgentIntegrationsPanelProps> = ({
  agentName,
  initialMcpConfigs = [],
  initialSkills = [],
  onClose,
}) => {
  const [mcpConfigs, setMcpConfigs] = useState<McpServerConfig[]>(initialMcpConfigs);
  const [skills, setSkills] = useState<AgentSkill[]>(initialSkills);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="agent-integrations-panel">
      <div className="card-alfabra w-full max-w-lg relative flex flex-col gap-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
        <div>
          <h3 className="font-bold text-text-primary text-sm heading-font uppercase">Integrações</h3>
          <p className="text-[11px] text-text-secondary">Servidores MCP e skills customizadas de &quot;{agentName}&quot;.</p>
        </div>

        <McpPanel configs={mcpConfigs} onChange={setMcpConfigs} />
        <div className="border-t border-border-color" />
        <SkillPanel skills={skills} onChange={setSkills} />
      </div>
    </div>
  );
};
