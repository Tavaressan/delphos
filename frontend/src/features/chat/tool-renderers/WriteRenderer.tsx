import React from 'react';
import { FileText } from 'lucide-react';
import { ToolCallShell } from './ToolCallShell';
import type { ToolCallPayload } from './types';

export const WriteRenderer: React.FC<{ toolCall: ToolCallPayload }> = ({ toolCall }) => {
  const filePath = toolCall.input?.filePath ?? toolCall.input?.file_path ?? '';
  const content = toolCall.input?.content ?? '';
  return (
    <ToolCallShell testId="tool-renderer-write" icon={<FileText className="w-3 h-3" />} label={`Escrever Arquivo — ${filePath}`}>
      <div className="text-slate-300 line-clamp-6">{content}</div>
    </ToolCallShell>
  );
};
