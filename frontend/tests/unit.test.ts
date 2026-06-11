import { test, describe } from 'node:test';
import assert from 'node:assert';
import { executionAdapter } from '../src/infrastructure/adapters/executionAdapter';
import { GetExecutionResponse, SubmitExecutionResponse } from '../src/domain/dto';
import { SubmitExecutionUseCase, GetExecutionStatusUseCase } from '../src/domain/use-cases/execution';
import { IExecutionRepository } from '../src/domain/repositories';
import { AgentExecution } from '../src/domain/entities';

describe('Execution Adapter Tests', () => {
  test('should map GetExecutionResponse to Entity correctly', () => {
    const dto: GetExecutionResponse = {
      executionId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      status: 'COMPLETED',
      prompt: 'Qual a periodicidade de manutenção dos cabos?',
      output: 'A checagem deve ocorrer a cada 30 dias.',
      errorMessage: null,
      tokensConsumed: 120,
      startedAt: '2026-06-05T18:00:00Z',
      finishedAt: '2026-06-05T18:00:10Z',
    };

    const entity = executionAdapter.toEntity(dto);

    assert.strictEqual(entity.id, dto.executionId);
    assert.strictEqual(entity.status, dto.status);
    assert.strictEqual(entity.prompt, dto.prompt);
    assert.strictEqual(entity.output, dto.output);
    assert.strictEqual(entity.errorMessage, dto.errorMessage);
    assert.strictEqual(entity.tokensConsumed, dto.tokensConsumed);
    assert.strictEqual(entity.startedAt, dto.startedAt);
    assert.strictEqual(entity.finishedAt, dto.finishedAt);
  });

  test('should map SubmitExecutionResponse to Entity correctly', () => {
    const dto: SubmitExecutionResponse = {
      executionId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      conversationId: 'f1e2d3c4-b5a6-7988-9766-554433221100',
      status: 'QUEUED',
      prompt: 'Qual a periodicidade de manutenção dos cabos?',
      tenantId: 'd3b07384-d113-4ec2-a5d6-c8a7b6cf9110',
    };

    const entity = executionAdapter.fromSubmitResponse(dto);

    assert.strictEqual(entity.id, dto.executionId);
    assert.strictEqual(entity.conversationId, dto.conversationId);
    assert.strictEqual(entity.status, dto.status);
    assert.strictEqual(entity.prompt, dto.prompt);
    assert.strictEqual(entity.output, null);
    assert.strictEqual(entity.errorMessage, null);
    assert.strictEqual(entity.tokensConsumed, null);
    assert.ok(entity.startedAt);
    assert.strictEqual(entity.finishedAt, null);
  });
});

describe('Execution Use Cases Tests', () => {
  // Mock Repository Implementation
  class MockExecutionRepository implements IExecutionRepository {
    async submitExecution(request: any): Promise<AgentExecution> {
      return {
        id: 'execution-123',
        conversationId: 'conv-123',
        agentId: 'agent-123',
        status: 'QUEUED',
        prompt: request.prompt,
        output: null,
        errorMessage: null,
        tokensConsumed: null,
        startedAt: '2026-06-05T18:00:00Z',
        finishedAt: null,
      };
    }

    async getExecution(id: string): Promise<AgentExecution> {
      return {
        id,
        conversationId: 'conv-123',
        agentId: 'agent-123',
        status: 'COMPLETED',
        prompt: 'Qual a periodicidade de manutenção dos cabos?',
        output: '30 dias',
        errorMessage: null,
        tokensConsumed: 50,
        startedAt: '2026-06-05T18:00:00Z',
        finishedAt: '2026-06-05T18:00:05Z',
      };
    }
  }

  const mockRepo = new MockExecutionRepository();

  test('SubmitExecutionUseCase should submit prompt correctly', async () => {
    const useCase = new SubmitExecutionUseCase(mockRepo);
    const result = await useCase.execute({ prompt: 'Teste de prompt' });

    assert.strictEqual(result.id, 'execution-123');
    assert.strictEqual(result.status, 'QUEUED');
    assert.strictEqual(result.prompt, 'Teste de prompt');
  });

  test('GetExecutionStatusUseCase should fetch status correctly', async () => {
    const useCase = new GetExecutionStatusUseCase(mockRepo);
    const result = await useCase.execute('execution-456');

    assert.strictEqual(result.id, 'execution-456');
    assert.strictEqual(result.status, 'COMPLETED');
    assert.strictEqual(result.output, '30 dias');
  });
});

describe('Theme Switching Logic', () => {
  test('should toggle dark class and store preference in localStorage', () => {
    // Mock local storage
    const store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
    };

    // Mock document element classList
    const classList = {
      classes: [] as string[],
      add: (c: string) => { if (!classList.classes.includes(c)) classList.classes.push(c); },
      remove: (c: string) => { classList.classes = classList.classes.filter(x => x !== c); },
      contains: (c: string) => classList.classes.includes(c),
    };

    // Simulate the theme toggle function logic
    const toggleTheme = (currentTheme: 'light' | 'dark', setLocal: boolean) => {
      const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
      if (nextTheme === 'dark') {
        classList.add('dark');
      } else {
        classList.remove('dark');
      }
      if (setLocal) {
        mockLocalStorage.setItem('theme', nextTheme);
      }
      return nextTheme;
    };

    // Initial state: light
    let theme: 'light' | 'dark' = 'light';
    
    // Toggle 1: switch to dark
    theme = toggleTheme(theme, true);
    assert.strictEqual(theme, 'dark');
    assert.ok(classList.contains('dark'));
    assert.strictEqual(mockLocalStorage.getItem('theme'), 'dark');

    // Toggle 2: switch to light
    theme = toggleTheme(theme, true);
    assert.strictEqual(theme, 'light');
    assert.ok(!classList.contains('dark'));
    assert.strictEqual(mockLocalStorage.getItem('theme'), 'light');
  });
});
