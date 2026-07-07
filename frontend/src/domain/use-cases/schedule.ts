import { IScheduleRepository } from '../repositories';
import { Schedule } from '../entities';
import { CreateScheduleRequest } from '../dto';

export class CreateScheduleUseCase {
  constructor(private scheduleRepository: IScheduleRepository) {}

  async execute(request: CreateScheduleRequest): Promise<Schedule> {
    return this.scheduleRepository.createSchedule(request);
  }
}

export class ListSchedulesUseCase {
  constructor(private scheduleRepository: IScheduleRepository) {}

  async execute(tenantId: string): Promise<Schedule[]> {
    return this.scheduleRepository.listSchedules(tenantId);
  }
}

export class CancelScheduleUseCase {
  constructor(private scheduleRepository: IScheduleRepository) {}

  async execute(id: string): Promise<void> {
    return this.scheduleRepository.cancelSchedule(id);
  }
}
