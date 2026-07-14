import React from 'react';
import { Wrench } from 'lucide-react';
import { ToolCallShell } from './ToolCallShell';
import type { ToolCallPayload } from './types';

/** Fallback genérico para tipos de ferramenta ainda não mapeados a um renderer específico. */
export const GenericToolRenderer: React.FC<{ toolCall: ToolCallPayload }> = ({ toolCall }) => (
  <ToolCallShell testId="tool-renderer-generic" icon={<Wrench className="w-3 h-3" />} label={toolCall.toolName}>
    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(toolCall.input, null, 2)}</pre>
    {toolCall.output && <div className="mt-1.5 text-slate-400">{toolCall.output}</div>}
  </ToolCallShell>
);
