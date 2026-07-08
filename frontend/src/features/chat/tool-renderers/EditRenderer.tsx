import React from 'react';
import { FileText } from 'lucide-react';
import { ToolCallShell } from './ToolCallShell';
import { DiffPreview } from './DiffPreview';
import type { ToolCallPayload } from './types';

export const EditRenderer: React.FC<{ toolCall: ToolCallPayload }> = ({ toolCall }) => {
  const filePath = toolCall.input?.filePath ?? toolCall.input?.file_path ?? '';
  const oldString = toolCall.input?.oldString ?? toolCall.input?.old_string ?? '';
  const newString = toolCall.input?.newString ?? toolCall.input?.new_string ?? '';

  return (
    <ToolCallShell testId="tool-renderer-edit" icon={<FileText className="w-3 h-3" />} label={`Editar Arquivo — ${filePath}`}>
      <DiffPreview oldString={oldString} newString={newString} />
    </ToolCallShell>
  );
};
