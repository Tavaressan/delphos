'use client';

import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  Settings, 
  Database, 
  Cpu, 
  Layers, 
  Search, 
  FileText, 
  Terminal, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Plus, 
  Trash, 
  LogOut, 
  ArrowRight, 
  ShieldCheck, 
  UploadCloud, 
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Sliders,
  Sparkles,
  Play,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock initial data
const INITIAL_AGENTS = [
  { id: '1', name: 'Analista de Falhas de Tração', version: 'v1.2.0', tag: 'Diagnóstico', status: 'PUBLISHED', description: 'Monitora sensores de cabos e polias de tração, gerando alertas preditivos de desgaste baseados em vibração.', tenant: 'Alfabra Elevadores - Matriz' },
  { id: '2', name: 'Otimizador de Tráfego de Cabine', version: 'v0.9.4', tag: 'Desempenho', status: 'IN_REVIEW', description: 'Analisa picos de tráfego predial em tempo real e reordena as chamadas prioritárias dos elevadores inteligentes.', tenant: 'Alfabra Elevadores - Matriz' },
  { id: '3', name: 'Agente de Conformidade NR-10', version: 'v2.0.1', tag: 'Segurança', status: 'PUBLISHED', description: 'Audita e valida a execução de tarefas elétricas de campo contra as normas regulamentadoras nacionais.', tenant: 'Alfabra Infra - Global' },
  { id: '4', name: 'Especialista em Documentação Técnica', version: 'v1.5.0', tag: 'RAG Support', status: 'PUBLISHED', description: 'Interpreta esquemas elétricos e manuais de manutenção física para apoiar o técnico na cabine.', tenant: 'Alfabra Elevadores - Matriz' }
];

const INITIAL_DOCS = [
  { id: 'doc-001', name: 'manual_manutencao_elevadores_seda_v5.pdf', size: '14.2 MB', chunks: 1420, status: 'INDEXED', date: '2026-05-27', author: 'Vitor Tavares' },
  { id: 'doc-002', name: 'norma_seguranca_contra_incendios_2025.pdf', size: '4.8 MB', chunks: 480, status: 'INDEXED', date: '2026-05-26', author: 'Vitor Tavares' },
  { id: 'doc-003', name: 'relatorio_inspecao_predio_b_marco.docx', size: '2.1 MB', chunks: 210, status: 'PROCESSING', date: '2026-05-28', author: 'Alex Souza' },
  { id: 'doc-004', name: 'esquema_eletrico_painel_comando_v3.pdf', size: '22.6 MB', chunks: 0, status: 'UPLOADING', date: '2026-05-28', author: 'Vitor Tavares' },
  { id: 'doc-005', name: 'legacy_fastapi_endpoints_old.txt', size: '1.2 MB', chunks: 0, status: 'FAILED', date: '2026-05-27', author: 'Sistema' }
];

const CHAT_HISTORY = [
  { role: 'system', content: 'Iniciando Assistente Técnico Alfabra. RAG ativo com busca híbrida de cosseno parametrizada.' },
  { role: 'user', content: 'Qual a periodicidade obrigatória para checagem dos cabos de tração em elevadores industriais de carga?' },
  { role: 'assistant', content: 'De acordo com a seção **4.2.1** do [manual_manutencao_elevadores_seda_v5.pdf](file:///manual_manutencao_elevadores_seda_v5.pdf#page=12), elevadores de carga industriais exigem uma inspeção visual completa dos cabos de tração a cada **30 dias operacionais** ou **500 ciclos de viagem**, o que ocorrer primeiro. Caso apresentem desgaste superior a 10% do diâmetro nominal, a troca imediata é mandatória.', citation: 'manual_manutencao_elevadores_seda_v5.pdf - Pág. 12' }
];

const TIMELINE_EVENTS = [
  { id: 1, name: 'REQUESTED', status: 'success', time: '10:39:10', details: 'Triggers de chat recebidos e autenticados com JWT.' },
  { id: 2, name: 'QUEUED', status: 'success', time: '10:39:11', details: 'Tarefa distribuída no RabbitMQ na fila agent.execution.jobs.' },
  { id: 3, name: 'STARTED', status: 'success', time: '10:39:11', details: 'Worker cognitivo crew-worker instanciado no pod Kubernetes.' },
  { id: 4, name: 'THINKING', status: 'success', time: '10:39:12', details: 'Agente CrewAI formulando plano de ação baseado nas regras de conformidade Alfabra.' },
  { id: 5, name: 'TOOL_RUNNING', status: 'warning', time: '10:39:13', details: 'Executando ferramenta mcp-database-query (timeoutMs: 15000) no banco Postgres.' },
  { id: 6, name: 'COMPLETED', status: 'pending', time: 'Aguardando', details: 'Consolidação e retorno da resposta final ao Spring Boot.' }
];

export default function MainPage() {
  const [activeTab, setActiveTab] = useState<'console' | 'catalog' | 'kb' | 'login' | 'tokens'>('console');
  const [tenant, setTenant] = useState('Alfabra Elevadores - Matriz');
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [captchaInput, setCaptchaInput] = useState('7X3P');
  const [captchaVerified, setCaptchaVerified] = useState(true);
  const [isLogged, setIsLogged] = useState(true);
  
  // Custom States
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [docs, setDocs] = useState(INITIAL_DOCS);
  const [chat, setChat] = useState(CHAT_HISTORY);
  const [inputMsg, setInputMsg] = useState('');
  const [searchAgent, setSearchAgent] = useState('');
  
  // Form simulation
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentTag, setNewAgentTag] = useState('Diagnóstico');
  const [newAgentDesc, setNewAgentDesc] = useState('');
  const [newAgentVersion, setNewAgentVersion] = useState('v1.0.0');

  // KB Sort/Filter states
  const [kbFilter, setKbFilter] = useState('');
  const [kbSortField, setKbSortField] = useState('name');
  
  // Document uploading mock simulation
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Filtered lists
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => 
      agent.name.toLowerCase().includes(searchAgent.toLowerCase()) || 
      agent.tag.toLowerCase().includes(searchAgent.toLowerCase())
    );
  }, [agents, searchAgent]);

  const sortedAndFilteredDocs = useMemo(() => {
    let result = docs.filter(doc => doc.name.toLowerCase().includes(kbFilter.toLowerCase()));
    result.sort((a: any, b: any) => {
      if (kbSortField === 'name') return a.name.localeCompare(b.name);
      if (kbSortField === 'size') return parseFloat(a.size) - parseFloat(b.size);
      if (kbSortField === 'chunks') return a.chunks - b.chunks;
      return 0;
    });
    return result;
  }, [docs, kbFilter, kbSortField]);

  const handleUploadFileMock = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null) return null;
        if (prev >= 100) {
          clearInterval(interval);
          setDocs(old => [
            { id: 'doc-' + Date.now(), name: 'manual_motores_trifasicos_novos.pdf', size: '8.4 MB', chunks: 840, status: 'INDEXED', date: new Date().toISOString().split('T')[0], author: 'Vitor Tavares' },
            ...old
          ]);
          setTimeout(() => setUploadProgress(null), 1000);
          return 100;
        }
        return prev + 30;
      });
    }, 400);
  };

  const handleCreateAgentMock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName || !newAgentDesc) return;
    const newAgent = {
      id: String(agents.length + 1),
      name: newAgentName,
      version: newAgentVersion,
      tag: newAgentTag,
      status: 'IN_REVIEW',
      description: newAgentDesc,
      tenant: tenant
    };
    setAgents(old => [newAgent, ...old]);
    setNewAgentName('');
    setNewAgentDesc('');
    setNewAgentVersion('v1.0.0');
  };

  const handleApproveAgent = (id: string) => {
    setAgents(old => old.map(a => a.id === id ? { ...a, status: 'PUBLISHED' } : a));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    const userMsg = { role: 'user', content: inputMsg };
    setChat(old => [...old, userMsg]);
    setInputMsg('');

    // Simulate agent output
    setTimeout(() => {
      const assistantMsg = {
        role: 'assistant',
        content: `Processado pelo bot da Alfabra: Analisando seu prompt em relação aos manuais. O sistema detectou menção de sensores nos esquemas da fábrica. Para solucionar isso, verifique as medições do barramento secundário na cabine técnica do elevador.`,
        citation: 'esquema_eletrico_painel_comando_v3.pdf - Pág. 3'
      };
      setChat(old => [...old, assistantMsg]);
    }, 1500);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-slate-800">
      
      {/* 1. Header principal da plataforma Alfabra */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src="/assets/images/LogoMarca_Alfabra.png" alt="Alfabra Logo" className="h-8 object-contain" />
          <span className="h-5 w-[1px] bg-slate-200" />
          <h1 className="text-sm font-bold tracking-wider text-primary select-none heading-font uppercase">
            Enterprise Agent Operating Platform
          </h1>
        </div>

        {isLogged ? (
          <div className="flex items-center gap-4 text-xs font-body">
            {/* Tenant Selection */}
            <div className="relative flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 cursor-pointer group hover:bg-slate-100 transition-all duration-150">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="font-semibold text-slate-600">{tenant}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
              
              <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded shadow-lg hidden group-hover:block w-52 overflow-hidden z-20">
                <div onClick={() => setTenant('Alfabra Elevadores - Matriz')} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-slate-700">Alfabra Elevadores - Matriz</div>
                <div onClick={() => setTenant('Alfabra Infra - Global')} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-slate-700">Alfabra Infra - Global</div>
              </div>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary text-white font-bold flex items-center justify-center text-sm shadow-sm select-none">
                VT
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-slate-700">Vitor Tavares</span>
                <span className="text-[10px] uppercase bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-mono font-bold border border-slate-200 flex items-center gap-0.5"><ShieldCheck className="w-2.5 h-2.5 text-primary" /> ROLE_ADMIN</span>
              </div>
            </div>

            <button onClick={() => setIsLogged(false)} className="text-slate-400 hover:text-danger hover:bg-red-50 p-1.5 rounded transition-all duration-200">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-xs">
            <span className="text-slate-400">Acesso Restrito</span>
          </div>
        )}
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Navigation Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 justify-between select-none">
          <div className="py-6 flex flex-col gap-1.5">
            
            <div className="px-6 mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest heading-font">
              Módulos Operacionais
            </div>

            <button 
              onClick={() => { if(isLogged) setActiveTab('console'); }}
              disabled={!isLogged}
              className={`px-6 py-3.5 flex items-center gap-3 text-sm font-semibold transition-all duration-200 ${
                !isLogged ? 'text-slate-700 cursor-not-allowed' :
                activeTab === 'console' 
                  ? 'bg-primary text-white border-l-4 border-accent' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Terminal className={`w-4.5 h-4.5 ${activeTab === 'console' ? 'text-accent' : 'text-slate-500'}`} />
              <span>Console de Agentes</span>
            </button>

            <button 
              onClick={() => { if(isLogged) setActiveTab('catalog'); }}
              disabled={!isLogged}
              className={`px-6 py-3.5 flex items-center gap-3 text-sm font-semibold transition-all duration-200 ${
                !isLogged ? 'text-slate-700 cursor-not-allowed' :
                activeTab === 'catalog' 
                  ? 'bg-primary text-white border-l-4 border-accent' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Cpu className={`w-4.5 h-4.5 ${activeTab === 'catalog' ? 'text-accent' : 'text-slate-500'}`} />
              <span>Catálogo de Agentes</span>
            </button>

            <button 
              onClick={() => { if(isLogged) setActiveTab('kb'); }}
              disabled={!isLogged}
              className={`px-6 py-3.5 flex items-center gap-3 text-sm font-semibold transition-all duration-200 ${
                !isLogged ? 'text-slate-700 cursor-not-allowed' :
                activeTab === 'kb' 
                  ? 'bg-primary text-white border-l-4 border-accent' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Database className={`w-4.5 h-4.5 ${activeTab === 'kb' ? 'text-accent' : 'text-slate-500'}`} />
              <span>Bases de Conhecimento</span>
            </button>

            <div className="h-[1px] bg-slate-800 my-4 mx-6" />

            <div className="px-6 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest heading-font">
              Configurações Gerais
            </div>

            <button 
              onClick={() => setActiveTab('tokens')}
              className={`px-6 py-3.5 flex items-center gap-3 text-sm font-semibold transition-all duration-200 ${
                activeTab === 'tokens' 
                  ? 'bg-primary text-white border-l-4 border-accent' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Layers className={`w-4.5 h-4.5 ${activeTab === 'tokens' ? 'text-accent' : 'text-slate-500'}`} />
              <span>Design System Tokens</span>
            </button>

            <button 
              onClick={() => setActiveTab('login')}
              className={`px-6 py-3.5 flex items-center gap-3 text-sm font-semibold transition-all duration-200 ${
                activeTab === 'login' 
                  ? 'bg-primary text-white border-l-4 border-accent' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Wrench className={`w-4.5 h-4.5 ${activeTab === 'login' ? 'text-accent' : 'text-slate-500'}`} />
              <span>Simular Tela de Login</span>
            </button>

          </div>

          {/* Sidebar footer showing branding status */}
          <div className="p-6 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Confiabilidade: 100%
            </div>
            <div className="text-[9px] text-slate-600 font-mono">
              ALFABRA SYSTEM V2.4.3
            </div>
          </div>
        </aside>

        {/* Content Box */}
        <main className="flex-1 flex flex-col overflow-y-auto min-w-0">
          
          {/* Main Tab Renderings */}
          <div className="p-8 flex-1 flex flex-col min-w-0">
            
            {/* IF NOT LOGGED, force login screen view */}
            {!isLogged ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-md bg-white border border-slate-200 rounded shadow-card overflow-hidden">
                  <div className="bg-primary p-6 text-center text-white flex flex-col items-center gap-3">
                    <img src="/assets/images/LogoMarca_Alfabra.png" alt="Alfabra" className="h-10 object-contain brightness-0 invert" />
                    <span className="text-xs uppercase font-mono font-bold tracking-widest text-accent">Login Unificado</span>
                  </div>
                  
                  <div className="p-8 flex flex-col gap-5">
                    <div>
                      <label className="label-alfabra">Usuário ou E-mail</label>
                      <input type="text" className="input-alfabra" placeholder="vitor.tavares@alfabra.com.br" defaultValue="vitor.tavares" />
                    </div>

                    <div>
                      <label className="label-alfabra">Senha</label>
                      <input type="password" className="input-alfabra" placeholder="••••••••" defaultValue="secretpassword" />
                    </div>

                    <div className="flex items-center justify-between border-t border-b border-slate-100 py-3">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="mfa" 
                          checked={mfaEnabled} 
                          onChange={(e) => setMfaEnabled(e.target.checked)} 
                          className="accent-primary h-4 w-4 rounded border-slate-200 focus:ring-primary"
                        />
                        <label htmlFor="mfa" className="text-xs text-slate-600 font-semibold select-none cursor-pointer">Autenticação MFA ativa (LibreChat)</label>
                      </div>
                    </div>

                    {mfaEnabled && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 bg-slate-50 border border-slate-200 rounded"
                      >
                        <label className="label-alfabra flex items-center justify-between">
                          <span>Token TOTP de 6 dígitos</span>
                          <span className="text-[9px] text-primary lowercase font-mono">auth app</span>
                        </label>
                        <input type="text" className="input-alfabra tracking-widest text-center text-lg font-mono font-bold" maxLength={6} placeholder="000 000" defaultValue="483921" />
                      </motion.div>
                    )}

                    {/* CAPTCHA simulation */}
                    <div className="border border-slate-200 rounded p-4 flex items-center justify-between bg-slate-50">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">CAPTCHA Requerido</span>
                        <span className="text-[10px] text-slate-400">Proteção contra bots</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="bg-slate-200 px-3 py-1.5 rounded font-mono font-bold tracking-widest text-slate-700 line-through select-none skew-x-12 skew-y-3">
                          7X3P
                        </div>
                        <input 
                          type="text" 
                          className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-center font-mono font-bold text-sm focus:outline-none focus:border-primary"
                          value={captchaInput}
                          onChange={(e) => {
                            setCaptchaInput(e.target.value);
                            setCaptchaVerified(e.target.value.toUpperCase() === '7X3P');
                          }}
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        if (captchaVerified) {
                          setIsLogged(true);
                          setActiveTab('console');
                        }
                      }}
                      disabled={!captchaVerified}
                      className={`btn-primary w-full ${!captchaVerified ? 'opacity-50 cursor-not-allowed bg-slate-300 border-slate-300 text-slate-500' : ''}`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Validar e Entrar</span>
                    </button>
                    
                    {!captchaVerified && (
                      <div className="flex items-center gap-1.5 justify-center text-danger text-xs font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Código CAPTCHA incorreto</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                
                {/* 1. Tab: Console de Conversação e Monitoramento */}
                {activeTab === 'console' && (
                  <motion.div 
                    key="console"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold tracking-wide text-slate-800 heading-font uppercase">Console Operacional de Agentes</h2>
                        <p className="text-slate-400 text-xs mt-1">Interação e auditoria em tempo real da orquestração dos workers cognitivos Alfabra.</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
                        </span>
                        <span className="text-xs font-semibold text-accent font-mono uppercase tracking-wider">Runtime Conectado via SSE</span>
                      </div>
                    </div>

                    {/* Chat and Sidebar Container */}
                    <div className="flex-1 flex gap-6 min-h-0">
                      
                      {/* Chat Canvas Area */}
                      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded shadow-discrete min-h-0 overflow-hidden">
                        
                        {/* Chat Messages */}
                        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
                          {chat.map((msg, index) => (
                            <div 
                              key={index}
                              className={`flex gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                            >
                              <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0 select-none ${
                                msg.role === 'system' ? 'bg-slate-100 text-slate-500' :
                                msg.role === 'user' ? 'bg-secondary text-slate-800 border border-slate-300' :
                                'bg-primary text-white'
                              }`}>
                                {msg.role === 'system' ? 'SYS' : msg.role === 'user' ? 'USR' : 'BOT'}
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <div className={`p-4 rounded border text-sm leading-relaxed ${
                                  msg.role === 'system' ? 'bg-slate-50 border-slate-100 text-slate-500 italic font-mono text-xs' :
                                  msg.role === 'user' ? 'bg-slate-50 border-slate-200 text-slate-800 font-semibold' :
                                  'bg-white border-slate-150 text-slate-700'
                                }`}>
                                  {msg.content}
                                </div>

                                {msg.citation && (
                                  <div className="flex items-center gap-1 text-[10px] text-primary font-bold ml-1">
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Citação:</span>
                                    <span className="underline cursor-pointer">{msg.citation}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Input Box */}
                        <form onSubmit={handleSendMessage} className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
                          <input 
                            type="text" 
                            className="input-alfabra flex-1" 
                            placeholder="Faça uma pergunta sobre a documentação ou acione um agente..." 
                            value={inputMsg}
                            onChange={(e) => setInputMsg(e.target.value)}
                          />
                          <button type="submit" className="btn-primary">
                            <span>Enviar</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </form>
                      </div>

                      {/* Memory Sidebar (4 pilares da Memória de Longo Prazo do MaxKB4j) */}
                      <div className="w-80 flex flex-col gap-4 flex-shrink-0">
                        
                        {/* 4 Pilares da Memoria */}
                        <div className="bg-white border border-slate-200 rounded shadow-discrete p-5 flex flex-col gap-4">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider heading-font">Memory Store (MaxKB4j)</span>
                            <span className="bg-primary/10 text-primary font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">Desacoplado</span>
                          </div>

                          <div className="flex flex-col gap-3">
                            {/* Pillar 1 */}
                            <div className="flex flex-col gap-1 border-b border-slate-50 pb-2">
                              <span className="text-[10px] font-bold text-primary uppercase">1. Preferências</span>
                              <span className="text-xs text-slate-600 italic">"Modelo de elevador configurado: Alfabra Atlas Cargo 2000."</span>
                            </div>

                            {/* Pillar 2 */}
                            <div className="flex flex-col gap-1 border-b border-slate-50 pb-2">
                              <span className="text-[10px] font-bold text-accent uppercase">2. Contexto Operacional</span>
                              <span className="text-xs text-slate-600">"Técnico realizando inspeção preventiva na cabine de tração."</span>
                            </div>

                            {/* Pillar 3 */}
                            <div className="flex flex-col gap-1 border-b border-slate-50 pb-2">
                              <span className="text-[10px] font-bold text-success uppercase">3. Regras de Negócio</span>
                              <span className="text-xs text-slate-600">"Normas técnicas de segurança brasileiras NR-10 e NR-18."</span>
                            </div>

                            {/* Pillar 4 */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-warning uppercase">4. Metas da Conversa</span>
                              <span className="text-xs text-slate-600">"Determinar as etapas e a frequência de substituição dos cabos."</span>
                            </div>
                          </div>
                        </div>

                        {/* Execution Timeline (RabbitMQ / Kubernetes) */}
                        <div className="bg-white border border-slate-200 rounded shadow-discrete p-5 flex flex-col gap-3 min-h-0 flex-1 overflow-hidden">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider heading-font">Execution timeline</span>
                            <Activity className="w-3.5 h-3.5 text-accent animate-pulse" />
                          </div>

                          <div className="overflow-y-auto flex-1 flex flex-col gap-4 pr-1">
                            {TIMELINE_EVENTS.map((event) => (
                              <div key={event.id} className="flex gap-3 text-xs">
                                <div className="flex flex-col items-center">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                                    event.status === 'success' ? 'bg-success' :
                                    event.status === 'warning' ? 'bg-warning' :
                                    'bg-slate-200 text-slate-500'
                                  }`}>
                                    {event.id}
                                  </div>
                                  <div className="w-[1.5px] h-full bg-slate-100 mt-1" />
                                </div>
                                <div className="flex flex-col flex-1 pb-2">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-700">{event.name}</span>
                                    <span className="text-[9px] font-mono text-slate-400">{event.time}</span>
                                  </div>
                                  <p className="text-slate-500 mt-0.5 text-[11px] leading-relaxed">{event.details}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. Tab: Catálogo de Agentes e Governança */}
                {activeTab === 'catalog' && (
                  <motion.div 
                    key="catalog"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold tracking-wide text-slate-800 heading-font uppercase">Catálogo de Agentes Homologados</h2>
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
                              <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                  <h3 className="font-bold text-slate-800 text-base">{agent.name}</h3>
                                  <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-mono font-bold">
                                    {agent.version}
                                  </span>
                                </div>
                                <p className="text-slate-500 text-xs leading-relaxed">{agent.description}</p>
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
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
                      <div className="w-full lg:w-96 bg-white border border-slate-200 rounded shadow-discrete p-6 flex flex-col gap-5 flex-shrink-0">
                        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                          <h3 className="font-bold text-slate-800 text-sm heading-font uppercase">Homologar Novo Agente</h3>
                          <span className="text-[10px] bg-red-100 text-danger border border-red-200 px-1.5 py-0.5 rounded font-mono font-bold">ADMIN ONLY</span>
                        </div>

                        <form onSubmit={handleCreateAgentMock} className="flex flex-col gap-4">
                          <div>
                            <label className="label-alfabra">Nome do Agente</label>
                            <input 
                              type="text" 
                              className="input-alfabra text-xs" 
                              placeholder="Ex: Monitor de Válvulas Hidráulicas" 
                              value={newAgentName}
                              onChange={(e) => setNewAgentName(e.target.value)}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
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

                          <div>
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
                          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[10px] font-mono text-slate-500">
                            <span className="font-bold text-slate-700">manifest.yaml preview:</span>
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

                          <button type="submit" className="btn-primary w-full text-xs">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Enviar Pacote (manifest.yaml)</span>
                          </button>
                        </form>
                      </div>

                    </div>
                  </motion.div>
                )}

                {/* 3. Tab: Bases de Conhecimento e Upload */}
                {activeTab === 'kb' && (
                  <motion.div 
                    key="kb"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex-1 flex flex-col min-h-0 animate-fade-in"
                  >
                    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold tracking-wide text-slate-800 heading-font uppercase">Gerenciador de Bases de Conhecimento</h2>
                        <p className="text-slate-400 text-xs mt-1">Carregue documentos corporativos para o pipeline de processamento vetorial PostgreSQL com pgvector.</p>
                      </div>
                      
                      {/* KB Info details */}
                      <div className="flex gap-4 text-xs">
                        <div className="bg-white border border-slate-200 rounded p-3 flex flex-col shadow-discrete">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Total Indexado</span>
                          <span className="font-bold text-primary text-base">2.95k Chunks</span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded p-3 flex flex-col shadow-discrete">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Limites de Espaço</span>
                          <span className="font-bold text-slate-700 text-base">44.9 MB / 100 MB</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col xl:flex-row gap-6">
                      
                      {/* Drag and drop upload mock area */}
                      <div className="flex-1 flex flex-col gap-6">
                        
                        <form 
                          onSubmit={handleUploadFileMock}
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUploadFileMock(e); }}
                          className={`border-2 border-dashed rounded-lg p-10 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-3 bg-white ${
                            dragOver ? 'border-accent bg-accent/5' : 'border-slate-300 hover:border-primary'
                          }`}
                        >
                          <UploadCloud className="w-12 h-12 text-slate-400" />
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700 text-sm">Arraste manuais técnicos ou esquemas elétricos aqui</span>
                            <span className="text-slate-400 text-xs mt-1">Aceita PDF, DOCX, TXT e Markdown (Tamanho máximo por arquivo: 50MB)</span>
                          </div>
                          
                          <button type="submit" className="btn-secondary text-xs mt-2">
                            Selecionar Arquivos Localmente
                          </button>

                          {uploadProgress !== null && (
                            <div className="w-full max-w-md bg-slate-100 rounded-full h-2 mt-4 overflow-hidden border border-slate-200">
                              <motion.div 
                                className="bg-accent h-full"
                                initial={{ width: '0%' }}
                                animate={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          )}
                        </form>

                        {/* List / Table of indexed files */}
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <h3 className="font-bold text-slate-700 text-sm heading-font uppercase">Documentos da Coleção</h3>
                            
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
                                    <td className="font-semibold text-slate-800">{doc.name}</td>
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
                                    <td className="font-mono text-slate-500 font-bold">{doc.chunks}</td>
                                    <td>{doc.date}</td>
                                    <td>{doc.author}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>

                      {/* Right Sidebar: Dynamic Chunking configurations & pgvector dimension preview */}
                      <div className="w-full xl:w-80 flex flex-col gap-4 flex-shrink-0">
                        <div className="bg-white border border-slate-200 rounded shadow-discrete p-5 flex flex-col gap-4">
                          <div className="border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-primary" />
                            <h3 className="font-bold text-slate-800 text-xs heading-font uppercase">Configurações de Chunking</h3>
                          </div>

                          <div className="flex flex-col gap-4">
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
                                <span className="text-xs font-bold text-slate-600">1000</span>
                              </div>
                              <input type="range" className="w-full accent-primary" min={200} max={2000} defaultValue={1000} />
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="label-alfabra m-0">Chunk Overlap</label>
                                <span className="text-xs font-bold text-slate-600">200</span>
                              </div>
                              <input type="range" className="w-full accent-accent" min={50} max={500} defaultValue={200} />
                            </div>

                            <div className="h-[1px] bg-slate-100" />

                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-600">Habilitar OCR (Tesseract)</span>
                              <input type="checkbox" className="accent-primary h-4 w-4" defaultChecked />
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-600">Abstração de Embeddings</span>
                              <span className="text-[10px] font-bold text-primary uppercase bg-primary/5 px-2 py-0.5 border border-primary/10 rounded">Vertex AI</span>
                            </div>
                          </div>
                        </div>

                        {/* Database specifications info */}
                        <div className="bg-white border border-slate-200 rounded shadow-discrete p-5 flex flex-col gap-3">
                          <h3 className="font-bold text-slate-700 text-xs heading-font uppercase border-b border-slate-100 pb-2">Status do pgvector (Postgres 16)</h3>
                          <div className="flex flex-col gap-2 font-mono text-[10px] text-slate-500">
                            <div className="flex justify-between">
                              <span>COLUNA VETORIAL:</span>
                              <span className="font-bold text-slate-700">embedding vector(DIMENSION)</span>
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
                  </motion.div>
                )}

                {/* 4. Tab: Design Tokens Guide */}
                {activeTab === 'tokens' && (
                  <motion.div 
                    key="tokens"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex-1 flex flex-col gap-6"
                  >
                    <div>
                      <h2 className="text-xl font-bold tracking-wide text-slate-800 heading-font uppercase">Guia de Design System Tokens</h2>
                      <p className="text-slate-400 text-xs mt-1">Mapeamento visual completo da identidade industrial e corporativa da Alfabra.</p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      
                      {/* Color Palette Preview */}
                      <div className="bg-white border border-slate-200 rounded shadow-discrete p-6 flex flex-col gap-4">
                        <h3 className="font-bold text-slate-700 text-sm heading-font uppercase border-b border-slate-100 pb-2.5">Sistema de Cores</h3>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {/* Primary */}
                          <div className="flex flex-col rounded border border-slate-150 overflow-hidden">
                            <div className="h-16 bg-primary" />
                            <div className="p-2.5 bg-slate-50 flex flex-col text-left">
                              <span className="text-xs font-bold text-slate-700">Primary</span>
                              <span className="text-[10px] font-mono text-slate-400">#22409A</span>
                            </div>
                          </div>

                          {/* Secondary */}
                          <div className="flex flex-col rounded border border-slate-150 overflow-hidden">
                            <div className="h-16 bg-[#E5E4E2] border-b border-slate-200" />
                            <div className="p-2.5 bg-slate-50 flex flex-col text-left">
                              <span className="text-xs font-bold text-slate-700">Secondary</span>
                              <span className="text-[10px] font-mono text-slate-400">#E5E4E2</span>
                            </div>
                          </div>

                          {/* Accent */}
                          <div className="flex flex-col rounded border border-slate-150 overflow-hidden">
                            <div className="h-16 bg-accent" />
                            <div className="p-2.5 bg-slate-50 flex flex-col text-left">
                              <span className="text-xs font-bold text-slate-700">Accent</span>
                              <span className="text-[10px] font-mono text-slate-400">#00ACC1</span>
                            </div>
                          </div>

                          {/* Success */}
                          <div className="flex flex-col rounded border border-slate-150 overflow-hidden">
                            <div className="h-16 bg-success" />
                            <div className="p-2.5 bg-slate-50 flex flex-col text-left">
                              <span className="text-xs font-bold text-slate-700">Success</span>
                              <span className="text-[10px] font-mono text-slate-400">#2E7D32</span>
                            </div>
                          </div>

                          {/* Warning */}
                          <div className="flex flex-col rounded border border-slate-150 overflow-hidden">
                            <div className="h-16 bg-warning" />
                            <div className="p-2.5 bg-slate-50 flex flex-col text-left">
                              <span className="text-xs font-bold text-slate-700">Warning</span>
                              <span className="text-[10px] font-mono text-slate-400">#F9A825</span>
                            </div>
                          </div>

                          {/* Danger */}
                          <div className="flex flex-col rounded border border-slate-150 overflow-hidden">
                            <div className="h-16 bg-danger" />
                            <div className="p-2.5 bg-slate-50 flex flex-col text-left">
                              <span className="text-xs font-bold text-slate-700">Danger</span>
                              <span className="text-[10px] font-mono text-slate-400">#C62828</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <div className="flex items-center justify-between p-3 bg-[#FBFBFE] rounded border border-slate-200">
                            <span className="text-xs font-bold text-slate-600">Background Fundo</span>
                            <span className="text-[11px] font-mono font-bold text-slate-500">#FBFBFE</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white rounded border border-slate-200">
                            <span className="text-xs font-bold text-slate-600">Surface Cards</span>
                            <span className="text-[11px] font-mono font-bold text-slate-500">#FFFFFF</span>
                          </div>
                        </div>
                      </div>

                      {/* Typography Preview */}
                      <div className="bg-white border border-slate-200 rounded shadow-discrete p-6 flex flex-col gap-4">
                        <h3 className="font-bold text-slate-700 text-sm heading-font uppercase border-b border-slate-100 pb-2.5">Tipografia e Fontes</h3>
                        
                        <div className="flex flex-col gap-4">
                          <div className="p-4 bg-slate-50 border border-slate-150 rounded flex flex-col gap-1 text-left">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Font Heading: Orbitron</span>
                            <span className="text-lg font-bold tracking-wider text-primary heading-font">ALFABRA ELEVADORES AUTOMATIZADOS</span>
                            <span className="text-xs text-slate-500 font-mono">Aplicado em títulos, marca e painéis de alto nível</span>
                          </div>

                          <div className="p-4 bg-slate-50 border border-slate-150 rounded flex flex-col gap-1.5 text-left">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Font Body: Overpass</span>
                            <span className="text-sm text-slate-700 leading-relaxed font-body">
                              Este texto demonstra a legibilidade da fonte de corpo. O Overpass é ideal para tabelas de conformidade, preenchimento de formulários de auditoria e timelines de status dos agentes Crews.
                            </span>
                            <div className="flex gap-4 text-xs font-bold text-slate-500 font-mono mt-1">
                              <span>LIGHT: 200</span>
                              <span>REGULAR: 400</span>
                              <span>BOLD: 600</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Core Buttons and Forms components styling rules previews */}
                      <div className="bg-white border border-slate-200 rounded shadow-discrete p-6 flex flex-col gap-4">
                        <h3 className="font-bold text-slate-700 text-sm heading-font uppercase border-b border-slate-100 pb-2.5">Componentes de Botões</h3>
                        <div className="flex flex-wrap gap-3">
                          <button className="btn-primary">Botão Primário</button>
                          <button className="btn-secondary">Botão Secundário</button>
                          <button className="btn-ghost">Botão Ghost</button>
                          <button className="btn-danger">Botão Danger</button>
                        </div>
                      </div>

                      {/* Forms styling preview */}
                      <div className="bg-white border border-slate-200 rounded shadow-discrete p-6 flex flex-col gap-4">
                        <h3 className="font-bold text-slate-700 text-sm heading-font uppercase border-b border-slate-100 pb-2.5">Campos de Formulários</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="label-alfabra">Input em foco / ativo</label>
                            <input type="text" className="input-alfabra" defaultValue="Foco no input..." />
                          </div>
                          <div>
                            <label className="label-alfabra flex justify-between">
                              <span>Input com Erro</span>
                              <span className="text-danger font-bold text-[9px] lowercase font-mono">Campo obrigatório</span>
                            </label>
                            <input type="text" className="input-alfabra border-danger focus:ring-danger" placeholder="Preencha o campo..." />
                          </div>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            )}

          </div>

          {/* Tab Menu selection visual fallback (for easier debugging and review) */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400 select-none">
            <span>Visualizando: Alfabra Design Token System (Alfabra Vector)</span>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setIsLogged(false)}>
                <LogOut className="w-3 h-3 text-danger" /> Logout Simulado
              </span>
            </div>
          </div>

        </main>
      </div>

    </div>
  );
}
