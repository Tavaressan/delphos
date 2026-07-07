import { Schedule } from '../../domain/entities';
import { ScheduleResponse } from '../../domain/dto';

export const scheduleAdapter = {
  toEntity(dto: ScheduleResponse): Schedule {
    return {
      id: dto.scheduleId,
      agentId: dto.agentId,
      agentName: dto.agentName,
      cronExpression: dto.cronExpression,
      prompt: dto.prompt,
      status: dto.status,
      createdAt: dto.createdAt,
      nextRunAt: dto.nextRunAt,
    };
  },
};
