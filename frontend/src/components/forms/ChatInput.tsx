'use client';

import React from 'react';
import { SendHorizontal } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Escreva seu prompt...',
  disabled = false,
}) => {
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 border border-border-color rounded-lg p-2 bg-secondary/25 dark:bg-slate-900/50 flex-shrink-0 shadow-sm transition-colors duration-200">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-0 outline-none text-sm text-text-primary placeholder-slate-400 font-body px-2 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="btn-primary p-2.5 rounded-md flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
      >
        <SendHorizontal className="w-4 h-4 text-white" />
      </button>
    </form>
  );
};
