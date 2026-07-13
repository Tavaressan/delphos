'use client';

import React from 'react';
import { DIMENSION_OPTIONS } from '../../modelConfig';

export interface DimensionSelectProps {
  value: number;
  onChange: (value: number) => void;
}

export const DimensionSelect: React.FC<DimensionSelectProps> = ({ value, onChange }) => (
  <label className="flex flex-col gap-1 text-xs text-text-secondary">
    Dimensão do vetor
    <select
      aria-label="Dimensão do vetor de embedding"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="bg-secondary/20 border border-border-color rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary"
    >
      {DIMENSION_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </label>
);
