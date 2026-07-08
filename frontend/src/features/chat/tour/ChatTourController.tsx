'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  CHAT_TOUR_STEPS,
  CHAT_TOUR_STORAGE_KEY,
  isLastStep,
  nextStepIndex,
  prevStepIndex,
  shouldAutoShowTour,
} from './chatTourSteps';
import { TourCard } from './TourCard';

export interface ChatTourControllerHandle {
  /** Reabre o tour manualmente a partir do primeiro passo. */
  openTour: () => void;
}

/**
 * Onboarding guiado (product tour) do chat (issue #140).
 * Exibe automaticamente no primeiro acesso (flag ausente no localStorage) e
 * pode ser reaberto manualmente via `openTour` (ref imperativa), usado pelo
 * botão "Tour" no header do ChatCanvas.
 */
export const ChatTourController = forwardRef<ChatTourControllerHandle>((_props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const completedFlag = window.localStorage.getItem(CHAT_TOUR_STORAGE_KEY);
    if (shouldAutoShowTour(completedFlag)) {
      setStepIndex(0);
      setIsOpen(true);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    openTour: () => {
      setStepIndex(0);
      setIsOpen(true);
    },
  }));

  const finishTour = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CHAT_TOUR_STORAGE_KEY, 'true');
    }
  };

  if (!isOpen) return null;

  const totalSteps = CHAT_TOUR_STEPS.length;
  const step = CHAT_TOUR_STEPS[stepIndex];

  return (
    <TourCard
      step={step}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      onNext={() => {
        if (isLastStep(stepIndex, totalSteps)) {
          finishTour();
        } else {
          setStepIndex((current) => nextStepIndex(current, totalSteps));
        }
      }}
      onPrev={() => setStepIndex((current) => prevStepIndex(current))}
      onSkip={finishTour}
    />
  );
});

ChatTourController.displayName = 'ChatTourController';
