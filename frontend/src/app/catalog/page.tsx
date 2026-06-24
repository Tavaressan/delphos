'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Header, Sidebar, Footer } from '../../components/layout';
import { AgentUploadManager } from '../../features/admin/components/AgentUploadManager';
import { Search } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { apiClient } from '../../infrastructure/api/apiClient';

interface Agent {
  id: string;
  name: string;
  version?: string;
  tag?: string;
  status?: string;
  description?: string;
  tenant?: string;
}

export default function CatalogPage() {
  const { tenantId } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchAgent, setSearchAgent] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleApproveAgent = async (id: string) => {
    setAgents(old => old.map(a => a.id === id ? { ...a, status: 'PUBLISHED' } : a));
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-text-primary">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background p-4 md:p-6 flex flex-col min-h-0 font-body">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-wide text-text-primary heading-font uppercase">Catálogo de Agentes Homologados</h2>
              <p className="text-slate-400 text-xs mt-1">Gestão de permissões de deploy de pacotes de conformidade de agentes cognitivos.</p>
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
                  {filteredAgents.map((agent) => (
                    <div key={agent.id} className="card-alfabra flex flex-col justify-between gap-4">
                      <div className="flex flex-col gap-2 text-left">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-text-primary text-base">{agent.name}</h3>
                          {agent.version && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-border-color px-2 py-0.5 rounded font-mono font-bold flex-shrink-0">
                              {agent.version}
                            </span>
                          )}
                        </div>
                        {agent.description && (
                          <p className="text-text-secondary text-xs leading-relaxed">{agent.description}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-border-color pt-3">
                        {agent.tag ? (
                          <span className="bg-primary/5 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/10">
                            #{agent.tag}
                          </span>
                        ) : <span />}

                        <div className="flex items-center gap-2">
                          {agent.status && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                              agent.status === 'PUBLISHED' ? 'bg-success/10 text-success border border-success/10' :
                              'bg-warning/10 text-warning border border-warning/10'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'PUBLISHED' ? 'bg-success' : 'bg-warning animate-pulse'}`} />
                              {agent.status === 'PUBLISHED' ? 'Publicado' : 'Em Revisão'}
                            </span>
                          )}

                          {agent.status === 'IN_REVIEW' && (
                            <button
                              onClick={() => handleApproveAgent(agent.id)}
                              className="bg-primary hover:bg-primary-dark text-white text-[10px] font-bold py-1 px-2.5 rounded transition-colors"
                            >
                              Aprovar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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
