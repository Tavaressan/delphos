'use client';

import React from 'react';
import { PermissionMode } from './types';

export interface PermissionModeSelectProps {
  value: PermissionMode;
  onChange: (mode: PermissionMode) => void;
  /** Rótulo acessível — ex.: nome do agente ou "Sessão". */
  label: string;
}

const OPTIONS: Array<{ value: PermissionMode; label: string }> = [
  { value: 'auto', label: 'Automático' },
  { value: 'ask', label: 'Perguntar sempre' },
  { value: 'deny', label: 'Negar' },
];

/**
 * Seletor de modo de permissão (auto / perguntar sempre / negar),
 * aplicável por agente ou por sessão conforme o contexto de uso.
 */
export const PermissionModeSelect: React.FC<PermissionModeSelectProps> = ({ value, onChange, label }) => {
  return (
    <label className="flex items-center gap-2 text-xs text-text-secondary">
      <span className="font-semibold">{label}:</span>
      <select
        aria-label={`Modo de permissão — ${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value as PermissionMode)}
        className="bg-surface border border-border-color rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors cursor-pointer"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
};
