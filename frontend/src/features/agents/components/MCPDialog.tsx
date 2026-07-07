import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { McpTransport } from '../../../domain/entities';
import { McpConfigInput, validateMcpConfigInput } from '../mcpConfig';

export interface MCPDialogProps {
  onAdd: (input: McpConfigInput) => void;
  onClose: () => void;
}

export const MCPDialog: React.FC<MCPDialogProps> = ({ onAdd, onClose }) => {
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [transport, setTransport] = useState<McpTransport>('stdio');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: McpConfigInput = { name, command, transport };
    const validationError = validateMcpConfigInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }
    onAdd(input);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="mcp-dialog">
      <div className="card-alfabra w-full max-w-sm relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="font-bold text-text-primary text-sm heading-font uppercase mb-4">Adicionar servidor MCP</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="label-alfabra" htmlFor="mcp-name">Nome</label>
            <Input id="mcp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: GitHub MCP" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label-alfabra" htmlFor="mcp-transport">Transporte</label>
            <select
              id="mcp-transport"
              value={transport}
              onChange={(e) => setTransport(e.target.value as McpTransport)}
              className="input-alfabra"
            >
              <option value="stdio">stdio (comando local)</option>
              <option value="sse">sse (URL remota)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="label-alfabra" htmlFor="mcp-command">
              {transport === 'stdio' ? 'Comando' : 'URL'}
            </label>
            <Input
              id="mcp-command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder={transport === 'stdio' ? 'npx -y @modelcontextprotocol/server-github' : 'https://exemplo.com/mcp'}
              required
            />
          </div>
          {error && <span className="text-xs text-danger">{error}</span>}
          <Button type="submit" className="mt-2">Adicionar</Button>
        </form>
      </div>
    </div>
  );
};
