import React from 'react';
import { FileText } from 'lucide-react';
import { ToolCallShell } from './ToolCallShell';
import type { ToolCallPayload } from './types';

export const ReadRenderer: React.FC<{ toolCall: ToolCallPayload }> = ({ toolCall }) => {
  const filePath = toolCall.input?.filePath ?? toolCall.input?.file_path ?? '';
  return (
    <ToolCallShell testId="tool-renderer-read" icon={<FileText className="w-3 h-3" />} label="Leitura de Arquivo">
      <div>{filePath}</div>
      {toolCall.output && <div className="mt-1.5 text-slate-400 line-clamp-6">{toolCall.output}</div>}
    </ToolCallShell>
  );
};
