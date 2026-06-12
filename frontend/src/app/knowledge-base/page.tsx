'use client';

import React, { useState, useMemo } from 'react';
import { Header, Sidebar, Footer } from '../../components/layout';
import { FileUploadArea } from '../../components/forms/FileUploadArea';
import { Search, Sliders, Database } from 'lucide-react';

const INITIAL_DOCS = [
  { id: 'doc-001', name: 'manual_manutencao_elevadores_seda_v5.pdf', size: '14.2 MB', chunks: 1420, status: 'INDEXED' as const, date: '2026-05-27', author: 'Vitor Tavares' },
  { id: 'doc-002', name: 'norma_seguranca_contra_incendios_2025.pdf', size: '4.8 MB', chunks: 480, status: 'INDEXED' as const, date: '2026-05-26', author: 'Vitor Tavares' },
  { id: 'doc-003', name: 'relatorio_inspecao_predio_b_marco.docx', size: '2.1 MB', chunks: 210, status: 'PROCESSING' as const, date: '2026-05-28', author: 'Alex Souza' },
  { id: 'doc-004', name: 'esquema_eletrico_painel_comando_v3.pdf', size: '22.6 MB', chunks: 0, status: 'UPLOADING' as const, date: '2026-05-28', author: 'Vitor Tavares' },
  { id: 'doc-005', name: 'legacy_fastapi_endpoints_old.txt', size: '1.2 MB', chunks: 0, status: 'FAILED' as const, date: '2026-05-27', author: 'Sistema' }
];

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState(INITIAL_DOCS);
  const [kbFilter, setKbFilter] = useState('');
  const [kbSortField, setKbSortField] = useState('name');
  const [isUploading, setIsUploading] = useState(false);
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);

  const handleFileSelect = (file: File) => {
    setIsUploading(true);
    
    // Simulate upload delay
    setTimeout(() => {
      const newDoc = {
        id: `doc-${Date.now()}`,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        chunks: Math.ceil(file.size / 10000), // simulated chunk calculation
        status: 'INDEXED' as const,
        date: new Date().toISOString().split('T')[0],
        author: 'Vitor Tavares',
      };
      setDocs(prev => [newDoc, ...prev]);
      setIsUploading(false);
    }, 2000);
  };

  const sortedAndFilteredDocs = useMemo(() => {
    let result = docs.filter(doc => 
      doc.name.toLowerCase().includes(kbFilter.toLowerCase())
    );

    if (kbSortField === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (kbSortField === 'size') {
      result.sort((a, b) => parseFloat(b.size) - parseFloat(a.size));
    } else if (kbSortField === 'chunks') {
      result.sort((a, b) => b.chunks - a.chunks);
    }

    return result;
  }, [docs, kbFilter, kbSortField]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-text-primary">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background p-6 flex flex-col min-h-0 font-body">
          
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-wide text-text-primary heading-font uppercase">Gerenciador de Bases de Conhecimento</h2>
              <p className="text-slate-400 text-xs mt-1">Carregue documentos corporativos para o pipeline de processamento vetorial PostgreSQL com pgvector.</p>
            </div>
            
            <div className="flex gap-4 text-xs">
              <div className="bg-white dark:bg-surface border border-slate-200 dark:border-border-color rounded p-3 flex flex-col shadow-discrete text-left">
                <span className="text-[10px] text-text-secondary uppercase font-bold">Total Indexado</span>
                <span className="font-bold text-primary text-base">2.95k Chunks</span>
              </div>
              <div className="bg-white dark:bg-surface border border-slate-200 dark:border-border-color rounded p-3 flex flex-col shadow-discrete text-left">
                <span className="text-[10px] text-text-secondary uppercase font-bold">Limites de Espaço</span>
                <span className="font-bold text-text-primary text-base">44.9 MB / 100 MB</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-6">
            
            {/* Drag and Drop & Table area */}
            <div className="flex-1 flex flex-col gap-6">
              
              <FileUploadArea onFileSelect={handleFileSelect} isLoading={isUploading} />

              {/* Table of indexed files */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="font-bold text-text-primary text-sm heading-font uppercase">Documentos da Coleção</h3>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        className="input-alfabra py-1.5 pl-8 text-xs w-48"
                        placeholder="Filtrar por nome..."
                        value={kbFilter}
                        onChange={(e) => setKbFilter(e.target.value)}
                      />
                    </div>
                    <select 
                      className="input-alfabra py-1.5 text-xs w-32"
                      value={kbSortField}
                      onChange={(e) => setKbSortField(e.target.value)}
                    >
                      <option value="name">Ordenar por Nome</option>
                      <option value="size">Ordenar por Tamanho</option>
                      <option value="chunks">Ordenar por Chunks</option>
                    </select>
                  </div>
                </div>

                <div className="table-container">
                  <table className="table-alfabra">
                    <thead>
                      <tr>
                        <th>Arquivo</th>
                        <th>Status</th>
                        <th>Tamanho</th>
                        <th>Chunks Vetoriais</th>
                        <th>Data</th>
                        <th>Responsável</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAndFilteredDocs.map((doc) => (
                        <tr key={doc.id}>
                          <td className="font-semibold text-text-primary">{doc.name}</td>
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
                          <td>{doc.size}</td>
                          <td className="font-mono text-text-secondary font-bold">{doc.chunks}</td>
                          <td>{doc.date}</td>
                          <td>{doc.author}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right Sidebar: Chunking configurations & pgvector dimension preview */}
            <div className="w-full xl:w-80 flex flex-col gap-4 flex-shrink-0">
              <div className="bg-white dark:bg-surface border border-slate-200 dark:border-border-color rounded shadow-discrete p-5 flex flex-col gap-4">
                <div className="border-b border-slate-100 dark:border-border-color pb-2.5 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-text-primary text-xs heading-font uppercase">Configurações de Chunking</h3>
                </div>

                <div className="flex flex-col gap-4 text-left">
                  <div>
                    <label className="label-alfabra">Estratégia de Fragmentação</label>
                    <div className="flex gap-2">
                      <button className="btn-primary py-1 px-3 text-[11px] rounded flex-1">Sentence Chunker</button>
                      <button className="btn-secondary py-1 px-3 text-[11px] rounded flex-1">Token Chunker</button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="label-alfabra m-0">Chunk Size (caracteres)</label>
                      <span className="text-xs font-bold text-text-secondary">{chunkSize}</span>
                    </div>
                    <input 
                      type="range" 
                      className="w-full accent-primary cursor-pointer" 
                      min={200} 
                      max={2000} 
                      value={chunkSize}
                      onChange={(e) => setChunkSize(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="label-alfabra m-0">Chunk Overlap</label>
                      <span className="text-xs font-bold text-text-secondary">{chunkOverlap}</span>
                    </div>
                    <input 
                      type="range" 
                      className="w-full accent-accent cursor-pointer" 
                      min={50} 
                      max={500} 
                      value={chunkOverlap} 
                      onChange={(e) => setChunkOverlap(Number(e.target.value))}
                    />
                  </div>

                  <div className="h-[1px] bg-slate-100 dark:bg-border-color" />

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-secondary">Habilitar OCR (Tesseract)</span>
                    <input type="checkbox" className="accent-primary h-4 w-4 cursor-pointer" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-secondary">Abstração de Embeddings</span>
                    <span className="text-[10px] font-bold text-primary uppercase bg-primary/5 px-2 py-0.5 border border-primary/10 rounded">Vertex AI</span>
                  </div>
                </div>
              </div>

              {/* Database specifications info */}
              <div className="bg-white dark:bg-surface border border-slate-200 dark:border-border-color rounded shadow-discrete p-5 flex flex-col gap-3">
                <h3 className="font-bold text-text-primary text-xs heading-font uppercase border-b border-slate-100 dark:border-border-color pb-2">Status do pgvector (Postgres 16)</h3>
                <div className="flex flex-col gap-2 font-mono text-[10px] text-text-secondary text-left">
                  <div className="flex justify-between">
                    <span>COLUNA VETORIAL:</span>
                    <span className="font-bold text-text-primary">embedding vector(DIMENSION)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DIMENSIONATIZAÇÃO:</span>
                    <span className="font-bold text-success">Parametrizável</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TIPO DE ÍNDICE:</span>
                    <span className="font-bold text-slate-700">hnsw</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FUNÇÃO DE DISTÂNCIA:</span>
                    <span className="font-bold text-slate-700">vector_cosine_ops</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
      <Footer />
    </div>
  );
}
