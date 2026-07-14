import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CHAT_TOUR_STEPS,
  nextStepIndex,
  prevStepIndex,
  isLastStep,
  shouldAutoShowTour,
} from '../src/features/chat/tour/chatTourSteps';
import { TourCard } from '../src/features/chat/tour/TourCard';

describe('chatTourSteps (issue #140)', () => {
  test('define ao menos os 3 passos-âncora: upload, seleção de agente e base de conhecimento', () => {
    const ids = CHAT_TOUR_STEPS.map((step) => step.id);
    assert.ok(ids.includes('agent-select'));
    assert.ok(ids.includes('chat-input'));
    assert.ok(ids.includes('knowledge-base'));
  });

  test('nextStepIndex avança um passo sem ultrapassar o último', () => {
    const total = CHAT_TOUR_STEPS.length;
    assert.strictEqual(nextStepIndex(0, total), 1);
    assert.strictEqual(nextStepIndex(total - 1, total), total - 1);
  });

  test('prevStepIndex retorna um passo sem ir abaixo de zero', () => {
    assert.strictEqual(prevStepIndex(2), 1);
    assert.strictEqual(prevStepIndex(0), 0);
  });

  test('isLastStep identifica corretamente o último passo', () => {
    const total = CHAT_TOUR_STEPS.length;
    assert.strictEqual(isLastStep(total - 1, total), true);
    assert.strictEqual(isLastStep(0, total), total === 1);
  });

  test('shouldAutoShowTour retorna true quando não há flag de conclusão', () => {
    assert.strictEqual(shouldAutoShowTour(null), true);
    assert.strictEqual(shouldAutoShowTour('true'), false);
    assert.strictEqual(shouldAutoShowTour('false'), true);
  });
});

describe('TourCard (issue #140)', () => {
  test('renderiza título/descrição do primeiro passo e o botão "Próximo"', () => {
    const html = renderToStaticMarkup(
      React.createElement(TourCard, {
        step: CHAT_TOUR_STEPS[0],
        stepIndex: 0,
        totalSteps: CHAT_TOUR_STEPS.length,
        onNext: () => {},
        onPrev: () => {},
        onSkip: () => {},
      })
    );

    assert.match(html, new RegExp(CHAT_TOUR_STEPS[0].title));
    assert.match(html, />Próximo</);
    assert.match(html, />Pular tour</);
    assert.match(html, /Passo 1 de 3/);
  });

  test('renderiza o botão "Concluir" (avançar) no último passo do tour', () => {
    const lastIndex = CHAT_TOUR_STEPS.length - 1;
    const html = renderToStaticMarkup(
      React.createElement(TourCard, {
        step: CHAT_TOUR_STEPS[lastIndex],
        stepIndex: lastIndex,
        totalSteps: CHAT_TOUR_STEPS.length,
        onNext: () => {},
        onPrev: () => {},
        onSkip: () => {},
      })
    );

    assert.match(html, new RegExp(CHAT_TOUR_STEPS[lastIndex].title));
    assert.match(html, />Concluir</);
    assert.doesNotMatch(html, />Próximo</);
  });

  test('desabilita o botão "Voltar" (pular passo anterior) apenas no primeiro passo', () => {
    const firstStepHtml = renderToStaticMarkup(
      React.createElement(TourCard, {
        step: CHAT_TOUR_STEPS[0],
        stepIndex: 0,
        totalSteps: CHAT_TOUR_STEPS.length,
        onNext: () => {},
        onPrev: () => {},
        onSkip: () => {},
      })
    );
    assert.match(firstStepHtml, /disabled=""/);

    const secondStepHtml = renderToStaticMarkup(
      React.createElement(TourCard, {
        step: CHAT_TOUR_STEPS[1],
        stepIndex: 1,
        totalSteps: CHAT_TOUR_STEPS.length,
        onNext: () => {},
        onPrev: () => {},
        onSkip: () => {},
      })
    );
    assert.doesNotMatch(secondStepHtml, /disabled=""/);
  });
});
