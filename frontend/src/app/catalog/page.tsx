'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Header, Sidebar, Footer } from '../../components/layout';
import { AgentUploadManager } from '../../features/admin/components/AgentUploadManager';
import { Search, Pencil, Check, X, PowerOff, Power, Trash2 } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { apiClient } from '../../infrastructure/api/apiClient';
import { canReactivate } from '../../features/catalog/agentStatus';
import { validateAgentZipFileName } from '../../features/admin/agentUploadValidation';

interface Agent {
  id: string;
  name: string;
  version?: string;
  tag?: string;
  status?: string;
  description?: string;
  tenant?: string;
  systemInstructions?: string;
}

interface EditState {
  name: string;
  description: string;
  tag: string;
  version: string;
  systemInstructions: string;
}

export default function CatalogPage() {
  const { tenantId } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchAgent, setSearchAgent] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: '', description: '', tag: '', version: '', systemInstructions: '' });
  const [editFile, setEditFile] = useState<File | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const list = await apiClient.get<Agent[]>(`/api/agents?tenantId=${tenantId}`);
      setAgents(list ?? []);
    } catch (err) {
      console.error('Erro ao carregar agentes:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const filteredAgents = useMemo(() => {
    return agents.filter(agent =>
      agent.name.toLowerCase().includes(searchAgent.toLowerCase()) ||
      (agent.tag ?? '').toLowerCase().includes(searchAgent.toLowerCase())
    );
  }, [agents, searchAgent]);

  const startEdit = (agent: Agent) => {
    setEditingId(agent.id);
    setEditFile(null);
    setActionError(null);
    setEditState({
      name: agent.name,
      description: agent.description ?? '',
      tag: agent.tag ?? '',
      version: agent.version ?? '',
      systemInstructions: agent.systemInstructions ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFile(null);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validationError = validateAgentZipFileName(selectedFile.name);
      if (validationError) {
        setActionError(validationError);
        return;
      }
    }
    setEditFile(selectedFile ?? null);
  };

  const extractErrorMessage = async (res: Response): Promise<string> => {
    try {
      const data = await res.json();
      if (data?.error) return data.error;
    } catch {
      // resposta sem corpo JSON; usa fallback abaixo
    }
    return `Status ${res.status}`;
  };

  const saveEdit = async (id: string) => {
    setActionLoading(id);
    setActionError(null);
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://rag-corporativo.duckdns.org';
      const res = await fetch(`${BASE_URL.replace(/\/$/, '')}/api/admin/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editState),
      });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      let updated: Agent = await res.json();

      if (editFile) {
        const formData = new FormData();
        formData.append('file', editFile);
        const packageRes = await fetch(`${BASE_URL.replace(/\/$/, '')}/api/admin/agents/${id}/package`, {
          method: 'PUT',
          body: formData,
        });
        if (!packageRes.ok) throw new Error(await extractErrorMessage(packageRes));
        updated = await packageRes.json();
      }

      setAgents(old => old.map(a => a.id === id ? { ...a, ...updated } : a));
      setEditingId(null);
      setEditFile(null);
    } catch (err) {
      console.error('Erro ao salvar agente:', err);
      setActionError(err instanceof Error ? err.message : 'Falha ao salvar as alterações do agente.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o agente "${name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setActionLoading(id);
    setActionError(null);
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://rag-corporativo.duckdns.org';
      const res = await fetch(`${BASE_URL.replace(/\/$/, '')}/api/admin/agents/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        if (res.status === 409) {
          setActionError('Não é possível excluir: há execuções em andamento para este agente.');
        } else {
          setActionError('Falha ao excluir o agente.');
        }
        return;
      }
      setAgents(old => old.filter(a => a.id !== id));
    } catch (err) {
      console.error('Erro ao excluir agente:', err);
      setActionError('Falha ao excluir o agente.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async (id: string) => {
    setActionLoading(id);
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://rag-corporativo.duckdns.org';
      const res = await fetch(`${BASE_URL.replace(/\/$/, '')}/api/admin/agents/${id}/publish`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setAgents(old => old.map(a => a.id === id ? { ...a, status: 'PUBLISHED' } : a));
    } catch (err) {
      console.error('Erro ao publicar agente:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (id: string) => {
    setActionLoading(id);
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://rag-corporativo.duckdns.org';
      const res = await fetch(`${BASE_URL.replace(/\/$/, '')}/api/admin/agents/${id}/deactivate`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setAgents(old => old.map(a => a.id === id ? { ...a, status: 'INACTIVE' } : a));
    } catch (err) {
      console.error('Erro ao desativar agente:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const statusLabel = (status?: string) => {
    if (status === 'PUBLISHED') return 'Publicado';
    if (status === 'INACTIVE') return 'Inativo';
    return 'Em Revisão';
  };

  const statusClass = (status?: string) => {
    if (status === 'PUBLISHED') return 'bg-success/10 text-success border border-success/10';
    if (status === 'INACTIVE') return 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700';
    return 'bg-warning/10 text-warning border border-warning/10';
  };

  const dotClass = (status?: string) => {
    if (status === 'PUBLISHED') return 'bg-success';
    if (status === 'INACTIVE') return 'bg-slate-400';
    return 'bg-warning animate-pulse';
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-text-primary">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background p-4 md:p-6 flex flex-col min-h-0 font-body">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-wide text-text-primary heading-font uppercase">Catálogo de Agentes</h2>
              <p className="text-slate-400 text-xs mt-1">Gestão de pacotes de governança de agentes</p>
            </div>

            <div className="w-full md:w-72 flex items-center bg-surface border border-border-color rounded focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all duration-200">
              <Search className="ml-3 w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                className="flex-1 bg-transparent py-2.5 px-2 text-sm text-text-primary placeholder-slate-400 focus:outline-none"
                placeholder="Buscar agente ou tag..."
                value={searchAgent}
                onChange={(e) => setSearchAgent(e.target.value)}
              />
            </div>
          </div>

          {actionError && !editingId && (
            <div className="mb-4 text-xs text-danger bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded px-3 py-2">
              {actionError}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">

            {/* Grid de Cards de Agentes */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-text-secondary text-sm">
                  Carregando agentes...
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-text-secondary text-sm border border-dashed border-border-color rounded-lg">
                  {agents.length === 0 ? 'Nenhum agente cadastrado.' : 'Nenhum agente encontrado para a busca.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAgents.map((agent) => {
                    const isEditing = editingId === agent.id;
                    const isActing = actionLoading === agent.id;

                    return (
                      <div key={agent.id} className="card-alfabra flex flex-col justify-between gap-4">
                        <div className="flex flex-col gap-2 text-left">
                          {isEditing ? (
                            <div className="flex flex-col gap-2">
                              <input
                                className="bg-secondary/20 border border-border-color rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-primary w-full"
                                value={editState.name}
                                onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                                placeholder="Nome do agente"
                              />
                              <input
                                className="bg-secondary/20 border border-border-color rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary w-full"
                                value={editState.description}
                                onChange={e => setEditState(s => ({ ...s, description: e.target.value }))}
                                placeholder="Descrição (opcional)"
                              />
                              <div className="flex gap-2">
                                <input
                                  className="bg-secondary/20 border border-border-color rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary flex-1"
                                  value={editState.tag}
                                  onChange={e => setEditState(s => ({ ...s, tag: e.target.value }))}
                                  placeholder="Tag (opcional)"
                                />
                                <input
                                  className="bg-secondary/20 border border-border-color rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary w-20"
                                  value={editState.version}
                                  onChange={e => setEditState(s => ({ ...s, version: e.target.value }))}
                                  placeholder="Versão"
                                />
                              </div>
                              <textarea
                                className="bg-secondary/20 border border-border-color rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary w-full font-mono"
                                rows={4}
                                value={editState.systemInstructions}
                                onChange={e => setEditState(s => ({ ...s, systemInstructions: e.target.value }))}
                                placeholder="Instruções de sistema (system instructions)"
                              />
                              <label className="text-[10px] text-text-secondary flex flex-col gap-1">
                                Reenviar pacote ZIP do agente (opcional)
                                <input
                                  type="file"
                                  accept=".zip"
                                  onChange={handleEditFileChange}
                                  className="text-[10px] text-text-secondary file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:text-text-secondary"
                                />
                              </label>
                              {actionError && (
                                <p className="text-[10px] text-danger">{actionError}</p>
                              )}
                            </div>
                          ) : (
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex flex-col gap-1 flex-1 min-w-0">
                                <h3 className="font-bold text-text-primary text-base">{agent.name}</h3>
                                {agent.description && (
                                  <p className="text-text-secondary text-xs leading-relaxed">{agent.description}</p>
                                )}
                              </div>
                              {agent.version && (
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-border-color px-2 py-0.5 rounded font-mono font-bold flex-shrink-0">
                                  {agent.version}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t border-border-color pt-3">
                          {!isEditing && agent.tag ? (
                            <span className="bg-primary/5 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/10">
                              #{agent.tag}
                            </span>
                          ) : <span />}

                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdit(agent.id)}
                                  disabled={isActing}
                                  className="flex items-center gap-1 bg-success/10 hover:bg-success/20 text-success text-[10px] font-bold py-1 px-2 rounded border border-success/20 transition-colors disabled:opacity-50"
                                >
                                  <Check className="w-3 h-3" /> Salvar
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-text-secondary text-[10px] font-bold py-1 px-2 rounded border border-border-color transition-colors"
                                >
                                  <X className="w-3 h-3" /> Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                {agent.status && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${statusClass(agent.status)}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${dotClass(agent.status)}`} />
                                    {statusLabel(agent.status)}
                                  </span>
                                )}

                                {agent.status === 'IN_REVIEW' && (
                                  <button
                                    onClick={() => handlePublish(agent.id)}
                                    disabled={isActing}
                                    className="bg-primary hover:bg-primary-dark text-white text-[10px] font-bold py-1 px-2.5 rounded transition-colors disabled:opacity-50"
                                  >
                                    Aprovar
                                  </button>
                                )}

                                {canReactivate(agent.status) && (
                                  <button
                                    onClick={() => handlePublish(agent.id)}
                                    disabled={isActing}
                                    className="flex items-center gap-1 bg-success/10 hover:bg-success/20 text-success text-[10px] font-bold py-1 px-2 rounded border border-success/20 transition-colors disabled:opacity-50"
                                  >
                                    <Power className="w-3 h-3" /> Reativar
                                  </button>
                                )}

                                <button
                                  onClick={() => startEdit(agent)}
                                  disabled={isActing}
                                  className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-text-secondary text-[10px] font-bold py-1 px-2 rounded border border-border-color transition-colors disabled:opacity-50"
                                >
                                  <Pencil className="w-3 h-3" /> Editar
                                </button>

                                {agent.status !== 'INACTIVE' && (
                                  <button
                                    onClick={() => handleDeactivate(agent.id)}
                                    disabled={isActing}
                                    className="flex items-center gap-1 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-danger text-[10px] font-bold py-1 px-2 rounded border border-red-200 dark:border-red-900/50 transition-colors disabled:opacity-50"
                                  >
                                    <PowerOff className="w-3 h-3" /> Desativar
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDelete(agent.id, agent.name)}
                                  disabled={isActing}
                                  className="flex items-center gap-1 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-danger text-[10px] font-bold py-1 px-2 rounded border border-red-200 dark:border-red-900/50 transition-colors disabled:opacity-50"
                                >
                                  <Trash2 className="w-3 h-3" /> Excluir
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Painel lateral: Upload de novo agente via ZIP */}
            <div className="w-full lg:w-96 flex-shrink-0">
              <AgentUploadManager onSuccess={fetchAgents} />
            </div>

          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
