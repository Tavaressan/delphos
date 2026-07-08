import React from 'react';
import { Search } from 'lucide-react';
import { ToolCallShell } from './ToolCallShell';
import type { ToolCallPayload } from './types';

/** Renderer compartilhado por buscas (glob/grep). */
export const SearchRenderer: React.FC<{ toolCall: ToolCallPayload }> = ({ toolCall }) => {
  const pattern = toolCall.input?.pattern ?? '';
  const path = toolCall.input?.path;
  return (
    <ToolCallShell testId="tool-renderer-search" icon={<Search className="w-3 h-3" />} label={`Busca (${toolCall.toolName})`}>
      <div>{pattern}</div>
      {path && <div className="text-slate-500">em {path}</div>}
      {toolCall.output && <div className="mt-1.5 text-slate-400 line-clamp-6">{toolCall.output}</div>}
    </ToolCallShell>
  );
};
