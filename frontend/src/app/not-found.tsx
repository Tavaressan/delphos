'use client';

import React from 'react';
import { Header } from '../components/layout';
import Link from 'next/link';
import { Button } from '../components/ui';
import { Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-text-primary transition-colors duration-200">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background/50 p-6 flex flex-col items-center justify-center min-h-0">
          <div className="max-w-2xl w-full bg-surface border border-border-color rounded-lg shadow-lg p-8 flex flex-col items-center gap-6 transition-colors duration-200">
            {/* 404 Icon */}
            <div className="flex items-center justify-center w-16 h-16 bg-warning/10 dark:bg-warning/20 rounded-full">
              <Search className="w-8 h-8 text-warning" />
            </div>

            {/* 404 Title and Subtitle */}
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-wider text-text-primary heading-font uppercase mb-2">
                404
              </h1>
              <p className="text-xl font-semibold text-text-primary mb-2">
                Página Não Encontrada
              </p>
              <p className="text-sm text-text-secondary">
                A página que você está procurando não existe ou foi movida.
              </p>
            </div>

            {/* Helpful Suggestions */}
            <div className="w-full bg-secondary/5 dark:bg-slate-900/30 border border-border-color rounded p-4">
              <p className="text-xs font-bold text-text-primary uppercase tracking-widest mb-2 heading-font">
                O que você pode fazer:
              </p>
              <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
                <li>Verificar se a URL está correta</li>
                <li>Voltar à página anterior</li>
                <li>Navegar através do menu principal</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-col sm:flex-row w-full">
              <Link href="/" className="flex-1">
                <Button variant="primary" className="w-full">
                  Voltar à Página Inicial
                </Button>
              </Link>
              <Button
                variant="secondary"
                onClick={() => window.history.back()}
                className="flex-1"
              >
                Voltar
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-text-secondary text-center leading-relaxed">
              Se você acredita que isso é um erro, entre em contato com o suporte técnico.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
