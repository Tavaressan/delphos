import React from 'react';

interface ToolCallShellProps {
  testId: string;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

/**
 * Wrapper visual compartilhado por todos os tool-renderers, garantindo
 * consistência de estilo (label + ícone + corpo em fonte monoespaçada).
 */
export const ToolCallShell: React.FC<ToolCallShellProps> = ({ testId, icon, label, children }) => (
  <div
    data-testid={testId}
    className="mt-2 rounded border border-border-color bg-slate-900 dark:bg-slate-950 text-slate-100 overflow-hidden"
  >
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-300">
      {icon}
      {label}
    </div>
    <div className="px-2.5 py-2 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-words">
      {children}
    </div>
  </div>
);
