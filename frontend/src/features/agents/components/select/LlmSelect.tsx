'use client';

import React from 'react';
import { LlmModel } from '../../../../domain/entities';
import { LLM_MODEL_OPTIONS } from '../../modelConfig';

export interface LlmSelectProps {
  value: LlmModel;
  onChange: (value: LlmModel) => void;
}

export const LlmSelect: React.FC<LlmSelectProps> = ({ value, onChange }) => (
  <label className="flex flex-col gap-1 text-xs text-text-secondary">
    Modelo (LLM)
    <select
      aria-label="Modelo de LLM"
      value={value}
      onChange={(e) => onChange(e.target.value as LlmModel)}
      className="bg-secondary/20 border border-border-color rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary"
    >
      {LLM_MODEL_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </label>
);
