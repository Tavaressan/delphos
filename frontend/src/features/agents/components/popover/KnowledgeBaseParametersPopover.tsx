'use client';

import React from 'react';
import { Database } from 'lucide-react';
import { AgentKnowledgeBaseConfig } from '../../../../domain/entities';
import { EmbeddingSelect } from '../select/EmbeddingSelect';
import { DimensionSelect } from '../select/DimensionSelect';

export interface KnowledgeBaseParametersPopoverProps {
  isOpen: boolean;
  config: AgentKnowledgeBaseConfig;
  onToggle: () => void;
  onChange: (config: AgentKnowledgeBaseConfig) => void;
  error?: string | null;
}

// Componente controlado (sem estado interno) para permitir teste de interação
// via chamada direta da função, sem simulação de eventos de DOM.
export const KnowledgeBaseParametersPopover: React.FC<KnowledgeBaseParametersPopoverProps> = ({
  isOpen,
  config,
  onToggle,
  onChange,
  error = null,
}) => {
  return (
    <div className="relative inline-block" data-testid="knowledge-base-parameters-popover">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Parâmetros da base de conhecimento"
        className="flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-primary"
      >
        <Database className="w-3.5 h-3.5" />
        Parâmetros da base de conhecimento
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Parâmetros da base de conhecimento"
          className="card-alfabra absolute z-40 mt-2 w-64 flex flex-col gap-3"
        >
          <EmbeddingSelect
            value={config.embeddingModel}
            onChange={(embeddingModel) => onChange({ ...config, embeddingModel })}
          />
          <DimensionSelect
            value={config.dimension}
            onChange={(dimension) => onChange({ ...config, dimension })}
          />
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>
      )}
    </div>
  );
};
