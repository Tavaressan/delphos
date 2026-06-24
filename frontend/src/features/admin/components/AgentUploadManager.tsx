import React, { useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../../providers/AuthProvider';

interface AgentUploadManagerProps {
  onSuccess?: () => void;
}

export const AgentUploadManager: React.FC<AgentUploadManagerProps> = ({ onSuccess }) => {
  const { tenantId } = useAuth();
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.name.endsWith('.zip')) {
        setError('O arquivo selecionado deve ser um arquivo ZIP (.zip).');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do agente.');
      return;
    }
    if (!file) {
      setError('Por favor, selecione o arquivo ZIP do agente.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('file', file);
    if (tenantId) {
      formData.append('tenantId', tenantId);
    }

    try {
      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://rag-corporativo.duckdns.org';
      const response = await fetch(`${BASE_URL.replace(/\/$/, '')}/api/admin/agents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errData: { error?: string } | undefined;
        try {
          errData = await response.json();
        } catch {
          // ignore
        }
        throw new Error(errData?.error || `Falha no upload (Status ${response.status})`);
      }

      setSuccess(`Agente "${name}" criado com sucesso! ZIP e documentos associados foram processados.`);
      setName('');
      setFile(null);
      const inputEl = document.getElementById('agent-zip-file') as HTMLInputElement;
      if (inputEl) inputEl.value = '';
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Falha ao criar o agente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-border-color rounded-lg p-6 shadow-sm flex flex-col gap-5 max-w-md w-full transition-colors duration-200">
      <div>
        <h3 className="text-sm font-bold text-text-primary heading-font uppercase">Gerenciar Agentes (Admin)</h3>
        <p className="text-[11px] text-text-secondary">Faça upload de pacotes ZIP com instruções markdown e conhecimento para novos agentes.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary" htmlFor="agent-name">Nome do Agente</label>
          <input
            id="agent-name"
            type="text"
            placeholder="Ex: Agente de Compliance"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            className="bg-secondary/20 border border-border-color rounded px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors placeholder:text-text-secondary/60"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary" htmlFor="agent-zip-file">Pacote ZIP</label>
          <div className="border-2 border-dashed border-border-color rounded-lg p-4 flex flex-col items-center justify-center text-center gap-2 hover:border-primary/50 transition-colors cursor-pointer relative bg-secondary/10">
            <input
              id="agent-zip-file"
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              disabled={loading}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload className="w-6 h-6 text-text-secondary opacity-60" />
            <span className="text-xs font-medium text-text-primary">
              {file ? file.name : 'Selecione ou arraste o arquivo ZIP'}
            </span>
            <span className="text-[10px] text-text-secondary">ZIP contendo arquivos .md, pdf, docx ou txt</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-danger rounded p-3 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 text-success rounded p-3 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dark text-white rounded py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processando ZIP...
            </>
          ) : (
            'Criar Agente'
          )}
        </button>
      </form>
    </div>
  );
};
