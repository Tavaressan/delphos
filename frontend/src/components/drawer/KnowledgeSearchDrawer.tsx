'use client';

import React from 'react';
import { Search, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

/**
 * Um trecho retornado pela busca semântica, com o score de similaridade
 * (0 a 1) calculado pelo rag-worker via pgvector.
 */
export interface SearchResultItem {
  id: string;
  documentName: string;
  excerpt: string;
  score: number;
}

export interface KnowledgeSearchDrawerProps {
  isOpen: boolean;
  query: string;
  results: SearchResultItem[];
  isLoading: boolean;
  error: string | null;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onClose: () => void;
}

const formatScore = (score: number) => `${(score * 100).toFixed(1)}%`;

/**
 * Drawer de busca semântica ad-hoc na base de conhecimento. Permite ao
 * usuário digitar uma query e inspecionar os top-k trechos retornados com
 * o respectivo score de similaridade, útil para depurar a qualidade do RAG.
 *
 * Componente controlado: todo o estado (query/results/loading/error) e as
 * chamadas de rede são responsabilidade do componente pai (knowledge-base
 * page), o que mantém este componente simples de testar via mock.
 */
export const KnowledgeSearchDrawer: React.FC<KnowledgeSearchDrawerProps> = ({
  isOpen,
  query,
  results,
  isLoading,
  error,
  onQueryChange,
  onSearch,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <div data-testid="knowledge-search-drawer" className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white dark:bg-surface border-l border-slate-200 dark:border-border-color shadow-xl flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-border-color">
        <h3 className="font-bold text-text-primary text-sm heading-font uppercase">Busca Semântica</h3>
        <button
          type="button"
          data-testid="knowledge-search-close"
          onClick={onClose}
          className="text-slate-400 hover:text-text-primary"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 flex gap-2 border-b border-slate-200 dark:border-border-color">
        <Input
          data-testid="knowledge-search-input"
          type="text"
          placeholder="Digite sua busca..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !query.trim()}>
          <Search className="w-3.5 h-3.5" />
        </Button>
      </form>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {isLoading && (
          <div data-testid="knowledge-search-loading" className="flex items-center gap-2 text-text-secondary text-xs justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            Buscando trechos relevantes...
          </div>
        )}

        {!isLoading && error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-danger rounded p-3 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isLoading && !error && results.length === 0 && (
          <div data-testid="knowledge-search-empty" className="text-center text-text-secondary italic text-xs py-8">
            {query.trim() ? 'Nenhum trecho encontrado para esta busca.' : 'Digite uma busca para ver os trechos mais relevantes.'}
          </div>
        )}

        {!isLoading && !error && results.map((result) => (
          <div key={result.id} data-testid="knowledge-search-result" className="border border-slate-200 dark:border-border-color rounded p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-text-primary text-xs truncate" title={result.documentName}>{result.documentName}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-success/10 text-success border border-success/10 flex-shrink-0">
                {formatScore(result.score)}
              </span>
            </div>
            <p className="text-text-secondary text-xs leading-relaxed">{result.excerpt}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
