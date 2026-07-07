import React from 'react';
import { Terminal } from 'lucide-react';
import { ToolCallShell } from './ToolCallShell';
import type { ToolCallPayload } from './types';

export const BashRenderer: React.FC<{ toolCall: ToolCallPayload }> = ({ toolCall }) => {
  const command = toolCall.input?.command ?? '';
  return (
    <ToolCallShell testId="tool-renderer-bash" icon={<Terminal className="w-3 h-3" />} label="Comando Shell">
      <div className="text-emerald-400">$ {command}</div>
      {toolCall.output && <div className="mt-1.5 text-slate-300">{toolCall.output}</div>}
    </ToolCallShell>
  );
};
