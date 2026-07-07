'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header, Sidebar, Footer } from '../../components/layout';
import { CalendarDays, List, Plus, XCircle } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { apiClient } from '../../infrastructure/api/apiClient';
import { useSchedules } from '../../hooks/useSchedules';
import { CreateScheduleDialog, ScheduleAgentOption } from '../../features/schedule/components/CreateScheduleDialog';
import { ScheduleCalendar } from '../../features/schedule/components/ScheduleCalendar';
import { describeCronExpression } from '../../features/schedule/cronUtils';

type Tab = 'list' | 'calendar';

export default function SchedulePage() {
  const { tenantId } = useAuth();
  const { schedules, loading, error, createSchedule, cancelSchedule } = useSchedules();

  const [tab, setTab] = useState<Tab>('list');
  const [agents, setAgents] = useState<ScheduleAgentOption[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [agentId, setAgentId] = useState('');
  const [cronExpression, setCronExpression] = useState('');
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!tenantId) return;
    try {
      const list = await apiClient.get<ScheduleAgentOption[]>(`/api/agents?tenantId=${tenantId}`);
      setAgents(list ?? []);
    } catch (err) {
      console.error('Erro ao carregar agentes para agendamento:', err);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const openDialog = () => {
    setAgentId('');
    setCronExpression('');
    setPrompt('');
    setSubmitError(null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => setIsDialogOpen(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createSchedule({ agentId, cronExpression, prompt });
      setIsDialogOpen(false);
    } catch (err: any) {
      setSubmitError(err.message || 'Falha ao criar agendamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancelar este agendamento? A execução recorrente será interrompida.')) return;
    try {
      await cancelSchedule(id);
    } catch (err) {
      console.error('Erro ao cancelar agendamento:', err);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-text-primary">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background p-4 md:p-6 flex flex-col min-h-0 font-body">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-wide text-text-primary heading-font uppercase">Agendamentos</h2>
              <p className="text-slate-400 text-xs mt-1">Execuções recorrentes de agentes via expressão cron</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-surface border border-border-color rounded overflow-hidden">
                <button
                  onClick={() => setTab('list')}
                  className={`flex items-center gap-1 text-xs font-bold px-3 py-2 transition-colors ${tab === 'list' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <List className="w-3.5 h-3.5" /> Lista
                </button>
                <button
                  onClick={() => setTab('calendar')}
                  className={`flex items-center gap-1 text-xs font-bold px-3 py-2 transition-colors ${tab === 'calendar' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <CalendarDays className="w-3.5 h-3.5" /> Calendário
                </button>
              </div>

              <button
                onClick={openDialog}
                className="flex items-center gap-1 bg-primary hover:bg-primary-dark text-white text-xs font-bold py-2 px-3 rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Agendamento
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 text-xs text-danger bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded px-3 py-2">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-text-secondary text-sm">
              Carregando agendamentos...
            </div>
          ) : tab === 'list' ? (
            schedules.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-text-secondary text-sm border border-dashed border-border-color rounded-lg">
                Nenhum agendamento cadastrado.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {schedules.map(schedule => (
                  <div key={schedule.id} className="card-alfabra flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-bold text-text-primary text-sm">{schedule.agentName ?? 'Agente'}</span>
                      <span className="text-text-secondary text-xs truncate">{schedule.prompt}</span>
                      <span className="text-[10px] font-mono text-slate-400">{schedule.cronExpression} — {describeCronExpression(schedule.cronExpression)}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${schedule.status === 'ACTIVE' ? 'bg-success/10 text-success border border-success/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'}`}>
                        {schedule.status === 'ACTIVE' ? 'Ativo' : 'Cancelado'}
                      </span>
                      {schedule.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleCancel(schedule.id)}
                          className="flex items-center gap-1 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-danger text-[10px] font-bold py-1 px-2 rounded border border-red-200 dark:border-red-900/50 transition-colors"
                        >
                          <XCircle className="w-3 h-3" /> Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <ScheduleCalendar schedules={schedules} />
          )}
        </main>
      </div>
      <Footer />

      <CreateScheduleDialog
        isOpen={isDialogOpen}
        agents={agents}
        agentId={agentId}
        cronExpression={cronExpression}
        prompt={prompt}
        submitting={submitting}
        submitError={submitError}
        onAgentChange={setAgentId}
        onCronChange={setCronExpression}
        onPromptChange={setPrompt}
        onSubmit={handleSubmit}
        onClose={closeDialog}
      />
    </div>
  );
}
