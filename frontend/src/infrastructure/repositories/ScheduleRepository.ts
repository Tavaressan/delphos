import { IScheduleRepository } from '../../domain/repositories';
import { Schedule } from '../../domain/entities';
import { CreateScheduleRequest, ScheduleResponse } from '../../domain/dto';
import { apiClient } from '../api/apiClient';
import { scheduleAdapter } from '../adapters/scheduleAdapter';

export class ScheduleRepository implements IScheduleRepository {
  async createSchedule(request: CreateScheduleRequest): Promise<Schedule> {
    const response = await apiClient.post<ScheduleResponse>('/api/schedules', request);
    return scheduleAdapter.toEntity(response);
  }

  async listSchedules(tenantId: string): Promise<Schedule[]> {
    const response = await apiClient.get<ScheduleResponse[]>(`/api/schedules?tenantId=${tenantId}`);
    return response.map(scheduleAdapter.toEntity);
  }

  async cancelSchedule(id: string): Promise<void> {
    await apiClient.delete(`/api/schedules/${id}`);
  }
}

export const scheduleRepository = new ScheduleRepository();
