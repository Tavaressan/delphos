'use client';

import { useState, useCallback, useEffect } from 'react';
import { Schedule } from '../domain/entities';
import { CreateScheduleRequest } from '../domain/dto';
import { CreateScheduleUseCase, ListSchedulesUseCase, CancelScheduleUseCase } from '../domain/use-cases/schedule';
import { scheduleRepository } from '../infrastructure/repositories/ScheduleRepository';
import { useAuth } from '../providers/AuthProvider';

const createUseCase = new CreateScheduleUseCase(scheduleRepository);
const listUseCase = new ListSchedulesUseCase(scheduleRepository);
const cancelUseCase = new CancelScheduleUseCase(scheduleRepository);

export const useSchedules = () => {
  const { tenantId } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listUseCase.execute(tenantId);
      setSchedules(result);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar agendamentos.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const createSchedule = async (request: Omit<CreateScheduleRequest, 'tenantId'>) => {
    const created = await createUseCase.execute({ ...request, tenantId });
    setSchedules(prev => [created, ...prev]);
    return created;
  };

  const cancelSchedule = async (id: string) => {
    await cancelUseCase.execute(id);
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, status: 'CANCELLED' } : s));
  };

  return { schedules, loading, error, fetchSchedules, createSchedule, cancelSchedule };
};
