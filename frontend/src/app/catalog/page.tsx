'use client';

import React, { useState, useMemo } from 'react';
import { Header, Sidebar, Footer } from '../../components/layout';
import { Search, Plus, Cpu } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';

const INITIAL_AGENTS = [
  { id: '1', name: 'Analista de Falhas de Tração', version: 'v1.2.0', tag: 'Diagnóstico', status: 'PUBLISHED', description: 'Monitora sensores de cabos e polias de tração, gerando alertas preditivos de desgaste baseados em vibração.', tenant: 'Alfabra Elevadores - Matriz' },
  { id: '2', name: 'Otimizador de Tráfego de Cabine', version: 'v0.9.4', tag: 'Desempenho', status: 'IN_REVIEW', description: 'Analisa picos de tráfego predial em tempo real e reordena as chamadas prioritárias dos elevadores inteligentes.', tenant: 'Alfabra Elevadores - Matriz' },
  { id: '3', name: 'Agente de Conformidade NR-10', version: 'v2.0.1', tag: 'Segurança', status: 'PUBLISHED', description: 'Audita e valida a execução de tarefas elétricas de campo contra as normas regulamentadoras nacionais.', tenant: 'Alfabra Infra - Global' },
  { id: '4', name: 'Especialista em Documentação Técnica', version: 'v1.5.0', tag: 'RAG Support', status: 'PUBLISHED', description: 'Interpreta esquemas elétricos e manuais de manutenção física para apoiar o técnico na cabine.', tenant: 'Alfabra Elevadores - Matriz' }
];

export default function CatalogPage() {
  const { isLogged } = useAuth();
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [searchAgent, setSearchAgent] = useState('');
  
  // Form fields
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentVersion, setNewAgentVersion] = useState('v1.0.0');
  const [newAgentTag, setNewAgentTag] = useState('Diagnóstico');
  const [newAgentDesc, setNewAgentDesc] = useState('');

  const filteredAgents = useMemo(() => {
    return agents.filter(agent => 
      agent.name.toLowerCase().includes(searchAgent.toLowerCase()) || 
      agent.tag.toLowerCase().includes(searchAgent.toLowerCase())
    );
  }, [agents, searchAgent]);

  const handleApproveAgent = (id: string) => {
    setAgents(old => old.map(a => a.id === id ? { ...a, status: 'PUBLISHED' } : a));
  };

  const handleCreateAgentMock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;

    const newAgent = {
      id: String(agents.length + 1),
      name: newAgentName,
      version: newAgentVersion,
      tag: newAgentTag,
      status: 'IN_REVIEW' as const,
      description: newAgentDesc || 'Descrição pendente de especificação.',
      tenant: 'Alfabra Elevadores - Matriz'
    };

    setAgents(old => [newAgent, ...old]);
    setNewAgentName('');
    setNewAgentDesc('');
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-text-primary">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background p-6 flex flex-col min-h-0 font-body">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-wide text-text-primary heading-font uppercase">Catálogo de Agentes Homologados</h2>
              <p className="text-slate-400 text-xs mt-1">Gestão de permissões de deploy de pacotes de conformidade de agentes cognitivos.</p>
            </div>

            <div className="relative w-72">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                className="input-alfabra pl-9" 
                placeholder="Buscar agente ou tag..." 
                value={searchAgent}
                onChange={(e) => setSearchAgent(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Grid de Cards de Agentes */}
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAgents.map((agent) => (
                  <div key={agent.id} className="card-alfabra flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-2 text-left">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-text-primary text-base">{agent.name}</h3>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-border-color px-2 py-0.5 rounded font-mono font-bold">
                          {agent.version}
                        </span>
                      </div>
                      <p className="text-text-secondary text-xs leading-relaxed">{agent.description}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-border-color pt-3">
                      <span className="bg-primary/5 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/10">
                        #{agent.tag}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                          agent.status === 'PUBLISHED' ? 'bg-success/10 text-success border border-success/10' :
                          'bg-warning/10 text-warning border border-warning/10'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'PUBLISHED' ? 'bg-success' : 'bg-warning animate-pulse'}`} />
                          {agent.status === 'PUBLISHED' ? 'Publicado' : 'Em Revisão'}
                        </span>

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
            </div>

            {/* Painel lateral: Enviar novo manifesto AgentPackage (ROLE_ADMIN) */}
            <div className="w-full lg:w-96 bg-white dark:bg-surface border border-slate-200 dark:border-border-color rounded shadow-discrete p-6 flex flex-col gap-5 flex-shrink-0">
              <div className="border-b border-slate-100 dark:border-border-color pb-3 flex items-center justify-between">
                <h3 className="font-bold text-text-primary text-sm heading-font uppercase">Homologar Novo Agente</h3>
                <span className="text-[10px] bg-red-100 text-danger border border-red-200 px-1.5 py-0.5 rounded font-mono font-bold">ADMIN ONLY</span>
              </div>

              <form onSubmit={handleCreateAgentMock} className="flex flex-col gap-4">
                <div className="text-left">
                  <label className="label-alfabra">Nome do Agente</label>
                  <input 
                    type="text" 
                    className="input-alfabra text-xs" 
                    placeholder="Ex: Monitor de Válvulas Hidráulicas" 
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <label className="label-alfabra">Versão SemVer</label>
                    <input 
                      type="text" 
                      className="input-alfabra text-xs font-mono" 
                      placeholder="v1.0.0" 
                      value={newAgentVersion}
                      onChange={(e) => setNewAgentVersion(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label-alfabra">Tag de Classificação</label>
                    <select 
                      className="input-alfabra text-xs"
                      value={newAgentTag}
                      onChange={(e) => setNewAgentTag(e.target.value)}
                    >
                      <option value="Diagnóstico">Diagnóstico</option>
                      <option value="Desempenho">Desempenho</option>
                      <option value="Segurança">Segurança</option>
                      <option value="RAG Support">RAG Support</option>
                    </select>
                  </div>
                </div>

                <div className="text-left">
                  <label className="label-alfabra">Descrição Operacional</label>
                  <textarea 
                    rows={3}
                    className="input-alfabra text-xs resize-none" 
                    placeholder="Explique detalhadamente o escopo do agente cognitivo e suas ferramentas..."
                    value={newAgentDesc}
                    onChange={(e) => setNewAgentDesc(e.target.value)}
                  />
                </div>

                {/* Simulação de manifest.yaml */}
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-border-color rounded p-3 text-[10px] font-mono text-text-secondary text-left">
                  <span className="font-bold text-text-primary">manifest.yaml preview:</span>
                  <pre className="mt-1.5 overflow-x-auto text-[9px] leading-tight">
{`name: "${newAgentName || 'untitled-agent'}"
version: "${newAgentVersion}"
tag: "${newAgentTag}"
role: "worker"
engine: "crewai"
tools:
  - "mcp-database-query"
  - "file-parser"`}
                  </pre>
                </div>

                <button type="submit" className="btn-primary w-full text-xs flex items-center justify-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Enviar Pacote (manifest.yaml)</span>
                </button>
              </form>
            </div>

          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
