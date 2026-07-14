import React, { useState } from 'react';
import { Plug, Trash2, Plus } from 'lucide-react';
import { Badge } from '../../../components/ui';
import { McpServerConfig } from '../../../domain/entities';
import { McpConfigInput, addMcpConfig, removeMcpConfig } from '../mcpConfig';
import { MCPDialog } from './MCPDialog';

export interface McpPanelProps {
  configs: McpServerConfig[];
  onChange: (configs: McpServerConfig[]) => void;
}

export const McpPanel: React.FC<McpPanelProps> = ({ configs, onChange }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = (input: McpConfigInput) => {
    try {
      onChange(addMcpConfig(configs, input));
      setError(null);
      setShowDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao adicionar servidor MCP.');
    }
  };

  const handleRemove = (id: string) => {
    onChange(removeMcpConfig(configs, id));
  };

  return (
    <div className="flex flex-col gap-3" data-testid="mcp-panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug className="w-4 h-4 text-primary" />
          <h4 className="font-bold text-text-primary text-xs heading-font uppercase">Servidores MCP</h4>
        </div>
        <button
          type="button"
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar
        </button>
      </div>

      {error && <span className="text-xs text-danger">{error}</span>}

      {configs.length === 0 ? (
        <p className="text-xs text-text-secondary" data-testid="mcp-empty-state">Nenhum servidor MCP configurado para este agente.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {configs.map((config) => (
            <li
              key={config.id}
              data-testid={`mcp-item-${config.id}`}
              className="flex items-center justify-between bg-secondary/10 border border-border-color rounded px-3 py-2"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-semibold text-text-primary truncate">{config.name}</span>
                <span className="text-[10px] text-text-secondary truncate">{config.command}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="secondary">{config.transport}</Badge>
                <button
                  type="button"
                  onClick={() => handleRemove(config.id)}
                  aria-label={`Remover ${config.name}`}
                  className="text-text-secondary hover:text-danger"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showDialog && <MCPDialog onAdd={handleAdd} onClose={() => setShowDialog(false)} />}
    </div>
  );
};
