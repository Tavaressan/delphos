import React from 'react';
import type { ToolCallPayload } from './types';
import { BashRenderer } from './BashRenderer';
import { EditRenderer } from './EditRenderer';
import { ReadRenderer } from './ReadRenderer';
import { WriteRenderer } from './WriteRenderer';
import { SearchRenderer } from './SearchRenderer';
import { GenericToolRenderer } from './GenericToolRenderer';

const BASH_TOOLS = new Set(['bash', 'shell', 'exec']);
const EDIT_TOOLS = new Set(['edit', 'str_replace', 'strreplace']);
const READ_TOOLS = new Set(['read']);
const WRITE_TOOLS = new Set(['write']);
const SEARCH_TOOLS = new Set(['glob', 'grep', 'search']);

/**
 * Dispatcher que escolhe o renderer específico com base no nome da
 * ferramenta invocada pelo agente, com fallback genérico para tipos
 * desconhecidos (issue #138).
 */
export const ToolCallRenderer: React.FC<{ toolCall: ToolCallPayload }> = ({ toolCall }) => {
  const toolName = (toolCall.toolName ?? '').toLowerCase();

  if (BASH_TOOLS.has(toolName)) return <BashRenderer toolCall={toolCall} />;
  if (EDIT_TOOLS.has(toolName)) return <EditRenderer toolCall={toolCall} />;
  if (READ_TOOLS.has(toolName)) return <ReadRenderer toolCall={toolCall} />;
  if (WRITE_TOOLS.has(toolName)) return <WriteRenderer toolCall={toolCall} />;
  if (SEARCH_TOOLS.has(toolName)) return <SearchRenderer toolCall={toolCall} />;

  return <GenericToolRenderer toolCall={toolCall} />;
};
