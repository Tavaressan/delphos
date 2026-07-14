'use client';

import React from 'react';
import { ChatTourStep } from './chatTourSteps';

interface TourCardProps {
  step: ChatTourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

/**
 * Cartão flutuante do onboarding guiado do chat (issue #140).
 * Componente puramente apresentacional — a navegação entre passos
 * (avançar/voltar/pular) é controlada pelo ChatTourController.
 */
export const TourCard: React.FC<TourCardProps> = ({ step, stepIndex, totalSteps, onNext, onPrev, onSkip }) => {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= totalSteps - 1;

  return (
    <div
      data-testid="chat-tour-card"
      className="fixed bottom-6 right-6 z-50 w-80 bg-surface border border-border-color rounded-lg shadow-lg p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">
          Passo {stepIndex + 1} de {totalSteps}
        </span>
        <button
          type="button"
          onClick={onSkip}
          data-testid="chat-tour-skip"
          className="text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          Pular tour
        </button>
      </div>

      <h4 className="text-sm font-bold text-text-primary heading-font">{step.title}</h4>
      <p className="text-xs text-text-secondary leading-relaxed">{step.description}</p>

      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst}
          data-testid="chat-tour-prev"
          className="text-xs font-semibold text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:text-primary transition-colors"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={onNext}
          data-testid="chat-tour-next"
          className="btn-primary text-xs font-semibold px-3 py-1.5 rounded transition-colors"
        >
          {isLast ? 'Concluir' : 'Próximo'}
        </button>
      </div>
    </div>
  );
};
