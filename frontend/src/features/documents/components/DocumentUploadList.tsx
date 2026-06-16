import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2, FileText, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../providers/AuthProvider';
import { apiClient } from '../../../infrastructure/api/apiClient';

interface DocumentMetadata {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  status: 'UPLOADING' | 'PROCESSING' | 'INDEXED' | 'FAILED';
  processingError?: string;
  createdAt?: string;
}

export const DocumentUploadList: React.FC<{ agentId?: string }> = ({ agentId }) => {
  const { tenantId } = useAuth();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      const list = await apiClient.get<DocumentMetadata[]>(`/api/documents?tenantId=${tenantId}`);
      const sorted = [...list].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
      setDocuments(sorted);
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchDocuments();
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;

    const interval = setInterval(() => {
      const hasPending = documents.some(doc => doc.status === 'PROCESSING' || doc.status === 'UPLOADING');
      if (hasPending) {
        fetchDocuments();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [tenantId, documents]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadingFile(file.name);
      setUploadProgress(10);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      if (tenantId) {
        formData.append('tenantId', tenantId);
      }
      if (agentId) {
        formData.append('agentId', agentId);
      }

      try {
        setUploadProgress(30);
        const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://rag-corporativo.duckdns.org';
        
        const interval = setInterval(() => {
          setUploadProgress(p => (p < 90 ? p + 10 : p));
        }, 100);

        const response = await fetch(`${BASE_URL.replace(/\/$/, '')}/api/documents/upload`, {
          method: 'POST',
          body: formData,
        });

        clearInterval(interval);
        setUploadProgress(100);

        if (!response.ok) {
          let errData;
          try {
            errData = await response.json();
          } catch {
            // ignore
          }
          throw new Error(errData?.error || `Falha no upload (Status ${response.status})`);
        }

        setTimeout(() => {
          setUploadingFile(null);
          setUploadProgress(0);
          fetchDocuments();
        }, 500);

      } catch (err: any) {
        setError(err.message || 'Falha ao enviar documento.');
        setUploadingFile(null);
        setUploadProgress(0);
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-surface border border-border-color rounded-lg p-6 shadow-sm flex flex-col gap-5 max-w-md w-full transition-colors duration-200">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-text-primary heading-font uppercase">Upload de Documentos</h3>
          <p className="text-[11px] text-text-secondary">Envie arquivos para indexação RAG na base de conhecimento.</p>
        </div>
        <button 
          onClick={fetchDocuments}
          className="p-1.5 rounded hover:bg-secondary/40 text-text-secondary hover:text-text-primary transition-colors"
          title="Atualizar lista"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="border-2 border-dashed border-border-color rounded-lg p-5 flex flex-col items-center justify-center text-center gap-2 hover:border-primary/50 transition-colors cursor-pointer relative bg-secondary/15">
        <input
          id="doc-upload-file"
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={handleFileUpload}
          disabled={!!uploadingFile}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <Upload className="w-6 h-6 text-text-secondary opacity-60" />
        <span className="text-xs font-semibold text-text-primary">
          Selecione ou arraste um documento
        </span>
        <span className="text-[10px] text-text-secondary">PDF, DOCX, TXT ou MD (Max 10MB)</span>
      </div>

      {uploadingFile && (
        <div className="bg-secondary/10 border border-border-color rounded-lg p-3 flex flex-col gap-2">
          <div className="flex justify-between text-[10px] text-text-primary font-medium">
            <span className="truncate max-w-[80%]">{uploadingFile}</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-secondary/35 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-danger rounded p-3 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider heading-font">Documentos recentes</span>
        
        {documents.length > 0 ? (
          <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className="flex items-center justify-between border border-border-color p-3 rounded bg-secondary/5 hover:bg-secondary/15 transition-colors text-xs gap-3"
              >
                <div className="flex items-center gap-2.5 truncate flex-1">
                  <FileText className="w-4 h-4 text-text-secondary opacity-70 flex-shrink-0" />
                  <div className="flex flex-col truncate">
                    <span className="font-semibold text-text-primary truncate" title={doc.name}>
                      {doc.name}
                    </span>
                    <span className="text-[10px] text-text-secondary">
                      {formatSize(doc.fileSize)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center">
                  {doc.status === 'INDEXED' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-success">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      INDEXADO
                    </span>
                  )}
                  {doc.status === 'PROCESSING' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-accent animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                      PROCESSANDO
                    </span>
                  )}
                  {doc.status === 'UPLOADING' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-text-secondary">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-text-secondary" />
                      ENVIANDO
                    </span>
                  )}
                  {doc.status === 'FAILED' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-danger" title={doc.processingError}>
                      <AlertCircle className="w-3.5 h-3.5 text-danger" />
                      ERRO
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border border-border-color border-dashed rounded text-text-secondary text-xs italic">
            Nenhum documento enviado ainda.
          </div>
        )}
      </div>
    </div>
  );
};
