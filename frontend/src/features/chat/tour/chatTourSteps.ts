/**
 * Passos do onboarding guiado (product tour) do chat (issue #140).
 * Mantido separado do controller/UI para permitir testes puros de navegação
 * (avançar/voltar/pular) sem depender de renderização ou DOM.
 */

export interface ChatTourStep {
  id: string;
  title: string;
  description: string;
  /** Seletor CSS do elemento destacado pelo passo (via atributo data-tour). */
  targetSelector: string;
}

export const CHAT_TOUR_STEPS: ChatTourStep[] = [
  {
    id: 'agent-select',
    title: 'Selecione o agente',
    description:
      'Escolha qual agente de IA irá processar sua próxima interação. Cada agente pode ter conhecimento e ferramentas diferentes.',
    targetSelector: '[data-tour="agent-select"]',
  },
  {
    id: 'chat-input',
    title: 'Envie seu prompt',
    description:
      'Digite sua pergunta ou instrução e envie para o agente selecionado processar sua solicitação.',
    targetSelector: '[data-tour="chat-input"]',
  },
  {
    id: 'knowledge-base',
    title: 'Base de conhecimento',
    description:
      'Respostas baseadas em documentos privados exibem as fontes RAG utilizadas, garantindo rastreabilidade.',
    targetSelector: '[data-tour="knowledge-base"]',
  },
];

/** Chave usada no localStorage para lembrar que o usuário já concluiu (ou pulou) o tour. */
export const CHAT_TOUR_STORAGE_KEY = 'alfabra_chat_tour_completed';

/** Avança para o próximo passo, sem ultrapassar o último índice válido. */
export function nextStepIndex(current: number, total: number): number {
  return Math.min(current + 1, total - 1);
}

/** Retorna ao passo anterior, sem ir abaixo do primeiro índice (0). */
export function prevStepIndex(current: number): number {
  return Math.max(current - 1, 0);
}

/** Indica se o passo atual é o último da sequência. */
export function isLastStep(current: number, total: number): boolean {
  return current >= total - 1;
}

/**
 * Decide se o tour deve ser exibido automaticamente, com base na flag
 * persistida no localStorage. `null`/qualquer valor diferente de 'true'
 * significa que o usuário ainda não concluiu nem pulou o tour.
 */
export function shouldAutoShowTour(completedFlag: string | null): boolean {
  return completedFlag !== 'true';
}
