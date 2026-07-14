import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MessageRole } from '../../types';

interface MessageContentProps {
  role: MessageRole;
  content: string;
}

/**
 * Renderiza o conteúdo de uma mensagem do chat.
 *
 * Mensagens de agente (ASSISTANT) podem vir formatadas em markdown (o modelo
 * costuma responder com negrito, listas e blocos de código) — por isso são
 * processadas via react-markdown, que não usa dangerouslySetInnerHTML nem
 * interpreta HTML bruto por padrão (proteção contra XSS).
 *
 * Mensagens de USER/SYSTEM são tratadas como texto puro para não interpretar
 * markdown digitado pelo usuário como formatação.
 */
export const MessageContent: React.FC<MessageContentProps> = ({ role, content }) => {
  if (role !== 'ASSISTANT') {
    return <>{content}</>;
  }

  return (
    <div className="markdown-body flex flex-col gap-2 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          strong: ({ children }) => <strong className="font-bold text-text-primary">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          p: ({ children }) => <p>{children}</p>,
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="bg-secondary/30 dark:bg-slate-700/60 text-text-primary rounded px-1 py-0.5 font-mono text-[11px]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={`font-mono text-[11px] ${className ?? ''}`} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-slate-900 text-slate-100 dark:bg-slate-950 rounded p-2.5 overflow-x-auto">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
