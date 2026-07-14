'use client';

import React from 'react';
import { EmbeddingModel } from '../../../../domain/entities';
import { EMBEDDING_MODEL_OPTIONS } from '../../modelConfig';

export interface EmbeddingSelectProps {
  value: EmbeddingModel;
  onChange: (value: EmbeddingModel) => void;
}

export const EmbeddingSelect: React.FC<EmbeddingSelectProps> = ({ value, onChange }) => (
  <label className="flex flex-col gap-1 text-xs text-text-secondary">
    Modelo de embedding
    <select
      aria-label="Modelo de embedding"
      value={value}
      onChange={(e) => onChange(e.target.value as EmbeddingModel)}
      className="bg-secondary/20 border border-border-color rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary"
    >
      {EMBEDDING_MODEL_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </label>
);
