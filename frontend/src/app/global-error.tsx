'use client';

import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error caught:', error);
  }, [error]);

  return (
    <html lang="pt-br" className="h-full">
      <head>
        <title>Erro — Alfabra</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="h-full bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-body">
        <div className="h-screen flex flex-col items-center justify-center bg-background p-6">
          <div className="max-w-2xl w-full bg-surface border border-border-color rounded-lg shadow-lg p-8 flex flex-col items-center gap-6">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-16 h-16 bg-danger/10 dark:bg-danger/20 rounded-full">
              <AlertTriangle className="w-8 h-8 text-danger" />
            </div>

            {/* Error Title */}
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-wide text-text-primary heading-font uppercase mb-2">
                Erro Crítico
              </h1>
              <p className="text-sm text-text-secondary">
                Um erro crítico ocorreu e a aplicação não pode continuar.
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

            {/* Error Digest for tracking */}
            {error.digest && (
              <div className="w-full text-center">
                <p className="text-[10px] text-text-secondary font-mono">
                  ID do erro: {error.digest}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 flex-col sm:flex-row w-full">
              <button
                onClick={reset}
                className="flex-1 px-4 py-2 bg-primary text-white rounded font-semibold hover:opacity-90 transition-opacity duration-200"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-2 bg-secondary text-text-primary rounded font-semibold hover:opacity-90 transition-opacity duration-200"
              >
                Voltar à Página Inicial
              </button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-text-secondary text-center leading-relaxed">
              Se o problema persistir, recarregue a página ou entre em contato com o suporte técnico.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
