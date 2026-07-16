'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { FileUploadArea } from '../../../components/forms/FileUploadArea';
import { KnowledgeSearchDrawer, SearchResultItem } from '../../../components/drawer/KnowledgeSearchDrawer';
import { Button } from '../../../components/ui/Button';
import { Search, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../providers/AuthProvider';
import { apiClient } from '../../../infrastructure/api/apiClient';

interface DocEntry {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  status: 'UPLOADING' | 'PROCESSING' | 'INDEXED' | 'FAILED';
  processingError?: string;
  createdAt?: string;
}

const formatSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function KnowledgeBasePage() {
  const { tenantId } = useAuth();
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [kbFilter, setKbFilter] = useState('');
  const [kbSortField, setKbSortField] = useState('date');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await apiClient.post<SearchResultItem[]>('/api/search', {
        query: searchQuery,
        tenantId,
      });
      setSearchResults(response ?? []);
    } catch (err: any) {
      setSearchError(err.message || 'Falha ao buscar trechos relevantes.');
    } finally {
      setIsSearching(false);
    }
  };

  const fetchDocs = async () => {
    try {
      const list = await apiClient.get<DocEntry[]>(`/api/documents?tenantId=${tenantId}`);
      setDocs(list ?? []);
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
    }
  };

  useEffect(() => {
    if (tenantId) fetchDocs();
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    const hasPending = docs.some(d => d.status === 'PROCESSING' || d.status === 'UPLOADING');
    if (!hasPending) return;
    const interval = setInterval(fetchDocs, 3000);
    return () => clearInterval(interval);
  }, [tenantId, docs]);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append('file', file);
    if (tenantId) formData.append('tenantId', tenantId);
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://rag-corporativo.duckdns.org';
      const response = await fetch(`${BASE_URL.replace(/\/$/, '')}/api/documents/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        let errData: { error?: string } | undefined;
        try { errData = await response.json(); } catch {}
        throw new Error(errData?.error || `Falha no upload (Status ${response.status})`);
      }
      await fetchDocs();
    } catch (err: any) {
      setUploadError(err.message || 'Falha ao enviar documento.');
    } finally {
      setIsUploading(false);
    }
  };

  const indexedDocs = docs.filter(d => d.status === 'INDEXED');
  const totalBytes = docs.reduce((sum, d) => sum + (d.fileSize || 0), 0);

  const sortedAndFilteredDocs = useMemo(() => {
    let result = docs.filter(doc =>
      doc.name.toLowerCase().includes(kbFilter.toLowerCase())
    );
    if (kbSortField === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (kbSortField === 'size') {
      result.sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0));
    } else if (kbSortField === 'date') {
      result.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    }
    return result;
  }, [docs, kbFilter, kbSortField]);

  return (
    <>
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background p-4 md:p-6 flex flex-col min-h-0 font-body">

          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-wide text-text-primary heading-font uppercase">Bases de Conhecimento</h2>
              <p className="text-slate-400 text-xs mt-1">Carregue suas fontes para processamento</p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="bg-white dark:bg-surface border border-slate-200 dark:border-border-color rounded p-3 flex flex-col shadow-discrete text-left">
                <span className="text-[10px] text-text-secondary uppercase font-bold">Docs Indexados</span>
                <span className="font-bold text-primary text-base">{indexedDocs.length} docs</span>
              </div>
              <div className="bg-white dark:bg-surface border border-slate-200 dark:border-border-color rounded p-3 flex flex-col shadow-discrete text-left">
                <span className="text-[10px] text-text-secondary uppercase font-bold">Armazenamento</span>
                <span className="font-bold text-text-primary text-base">{formatSize(totalBytes)}</span>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsSearchDrawerOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                Busca Semântica
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-6">

            <FileUploadArea onFileSelect={handleFileSelect} isLoading={isUploading} />

            {uploadError && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-danger rounded p-3 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold text-text-primary text-sm heading-font uppercase">Documentos</h3>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-surface border border-border-color rounded focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all duration-200">
                    <Search className="ml-2.5 w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      className="w-36 bg-transparent py-1.5 px-2 text-xs text-text-primary placeholder-slate-400 focus:outline-none"
                      placeholder="Filtrar por nome..."
                      value={kbFilter}
                      onChange={(e) => setKbFilter(e.target.value)}
                    />
                  </div>
                  <select
                    className="input-alfabra py-1.5 text-xs w-36"
                    value={kbSortField}
                    onChange={(e) => setKbSortField(e.target.value)}
                  >
                    <option value="date">Ordenar por Data</option>
                    <option value="name">Ordenar por Nome</option>
                    <option value="size">Ordenar por Tamanho</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded border border-slate-200 dark:border-border-color">
                <table className="table-alfabra">
                  <thead>
                    <tr>
                      <th>Arquivo</th>
                      <th>Tipo</th>
                      <th>Status</th>
                      <th>Tamanho</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAndFilteredDocs.length > 0 ? sortedAndFilteredDocs.map((doc) => (
                      <tr key={doc.id}>
                        <td className="font-semibold text-text-primary">
                          <span className="block max-w-xs truncate" title={doc.name}>{doc.name}</span>
                        </td>
                        <td className="font-mono text-text-secondary text-[11px]">{doc.fileType || '—'}</td>
                        <td>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-max ${
                            doc.status === 'INDEXED' ? 'bg-success/10 text-success border border-success/10' :
                            doc.status === 'PROCESSING' ? 'bg-accent/10 text-accent border border-accent/10 animate-pulse' :
                            doc.status === 'UPLOADING' ? 'bg-warning/10 text-warning border border-warning/10' :
                            'bg-danger/10 text-danger border border-danger/10'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              doc.status === 'INDEXED' ? 'bg-success' :
                              doc.status === 'PROCESSING' ? 'bg-accent' :
                              doc.status === 'UPLOADING' ? 'bg-warning' :
                              'bg-danger'
                            }`} />
                            {doc.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">{formatSize(doc.fileSize)}</td>
                        <td className="whitespace-nowrap">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('pt-BR') : '—'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="text-center text-text-secondary italic py-8">
                          {docs.length === 0 ? 'Nenhum documento na coleção.' : 'Nenhum resultado para o filtro aplicado.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </main>
      <KnowledgeSearchDrawer
        isOpen={isSearchDrawerOpen}
        query={searchQuery}
        results={searchResults}
        isLoading={isSearching}
        error={searchError}
        onQueryChange={setSearchQuery}
        onSearch={handleSemanticSearch}
        onClose={() => setIsSearchDrawerOpen(false)}
      />
    </>
  );
}
