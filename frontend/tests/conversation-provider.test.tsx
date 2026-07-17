import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConversationProvider, useConversations } from '../src/providers/ConversationProvider';

// Mock AuthProvider context since we don't want to test it here
const MockAuth = React.createContext({ tenantId: 'tenant-123', isLogged: true });
// Override useAuth? Actually useAuth is imported from AuthProvider inside ConversationProvider.
// To override it, we can just let it crash or mock it.
// Wait, we can't easily mock useAuth since it's an ES module import and we are running deno.
// It's better to just wrap ConversationProvider inside AuthProvider? No, AuthProvider uses localStorage too.

// Simple LocalStorage mock
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    }
  };
};

describe('ConversationProvider - Issue #233', () => {
  let originalLocalStorage: any;

  beforeEach(() => {
    originalLocalStorage = (globalThis as any).localStorage;
    (globalThis as any).localStorage = createMockLocalStorage();
  });

  afterEach(() => {
    (globalThis as any).localStorage = originalLocalStorage;
  });

  test('restores activeConversationId from localStorage', async () => {
    // Arrange
    globalThis.localStorage.setItem('activeConversationId', 'conv-999');

    // To mock useAuth inside ConversationProvider without a testing library:
    // Actually, AuthProvider creates AuthContext but ConversationProvider imports `useAuth` directly.
    // Deno test doesn't intercept imports easily without a mock module loader.
    // However, if we just render it, it will try to call `useAuth()`.
    // Let's just import AuthProvider and wrap it.
    const { AuthProvider } = await import('../src/providers/AuthProvider');

    const TestConsumer = () => {
      const { activeConversationId } = useConversations();
      return <div data-testid="active-id">{activeConversationId || 'null'}</div>;
    };

    const html = renderToStaticMarkup(
      <AuthProvider>
        <ConversationProvider>
          <TestConsumer />
        </ConversationProvider>
      </AuthProvider>
    );

    // Assert
    // It should render 'conv-999' instead of 'null'
    assert.match(html, /conv-999/, 'activeConversationId should be restored from localStorage');
  });
});
