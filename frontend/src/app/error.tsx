'use client';

import React from 'react';
import { Header } from '../components/layout';
import { Button } from '../components/ui';
import { AlertTriangle } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-text-primary transition-colors duration-200">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background/50 p-6 flex flex-col items-center justify-center min-h-0">
          <div className="max-w-2xl w-full bg-surface border border-border-color rounded-lg shadow-lg p-8 flex flex-col items-center gap-6 transition-colors duration-200">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-16 h-16 bg-danger/10 dark:bg-danger/20 rounded-full">
              <AlertTriangle className="w-8 h-8 text-danger" />
            </div>

            {/* Error Title */}
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-wide text-text-primary heading-font uppercase mb-2">
                Oops! Algo deu errado
              </h1>
              <p className="text-sm text-text-secondary">
                Um erro inesperado ocorreu durante a renderização desta página.
              </p>
            </div>

            {/* Error Details */}
            {error.message && (
              <div className="w-full bg-danger/5 dark:bg-danger/10 border border-danger/20 rounded p-4">
                <p className="text-xs font-mono text-danger break-words">
                  {error.message}
                </p>
              </div>
            )}

            {/* Error Digest (for error tracking) */}
            {error.digest && (
              <div className="w-full text-center">
                <p className="text-[10px] text-text-secondary font-mono">
                  ID do erro: {error.digest}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 flex-col sm:flex-row w-full">
              <Button
                variant="primary"
                onClick={reset}
                className="flex-1"
              >
                Tentar Novamente
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.href = '/'}
                className="flex-1"
              >
                Voltar à Página Inicial
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-text-secondary text-center leading-relaxed">
              Se o problema persistir, tente recarregar a página ou entre em contato com o suporte técnico.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
