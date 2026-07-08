'use client';

import React from 'react';
import { Settings2 } from 'lucide-react';
import { AgentModelConfig } from '../../../../domain/entities';
import { LlmSelect } from '../select/LlmSelect';

export interface ModelParametersPopoverProps {
  isOpen: boolean;
  config: AgentModelConfig;
  onToggle: () => void;
  onChange: (config: AgentModelConfig) => void;
  error?: string | null;
}

// Componente controlado (sem estado interno) para permitir teste de interação
// via chamada direta da função, sem simulação de eventos de DOM.
export const ModelParametersPopover: React.FC<ModelParametersPopoverProps> = ({
  isOpen,
  config,
  onToggle,
  onChange,
  error = null,
}) => {
  return (
    <div className="relative inline-block" data-testid="model-parameters-popover">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Parâmetros do modelo"
        className="flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-primary"
      >
        <Settings2 className="w-3.5 h-3.5" />
        Parâmetros do modelo
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Parâmetros do modelo"
          className="card-alfabra absolute z-40 mt-2 w-64 flex flex-col gap-3"
        >
          <LlmSelect value={config.llmModel} onChange={(llmModel) => onChange({ ...config, llmModel })} />

          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            <span>Temperatura ({config.temperature.toFixed(2)})</span>
            <input
              aria-label="Temperatura"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.temperature}
              onChange={(e) => onChange({ ...config, temperature: Number(e.target.value) })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            <span>Top-p ({config.topP.toFixed(2)})</span>
            <input
              aria-label="Top-p"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.topP}
              onChange={(e) => onChange({ ...config, topP: Number(e.target.value) })}
            />
          </label>

          {error && <span className="text-xs text-danger">{error}</span>}
        </div>
      )}
    </div>
  );
};
