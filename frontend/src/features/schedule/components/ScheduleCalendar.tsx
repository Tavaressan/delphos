'use client';

import React from 'react';
import { Schedule } from '../../../domain/entities';

export interface ScheduleCalendarProps {
  schedules: Schedule[];
  referenceDate?: Date;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Grade mensal simples: agrupa os agendamentos pela data da próxima execução (nextRunAt) e
// destaca os dias do mês corrente que possuem execuções previstas.
export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ schedules, referenceDate = new Date() }) => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDayOfMonth.getDay();

  const schedulesByDay = new Map<number, Schedule[]>();
  schedules.forEach(schedule => {
    if (!schedule.nextRunAt || schedule.status !== 'ACTIVE') return;
    const date = new Date(schedule.nextRunAt);
    if (date.getFullYear() !== year || date.getMonth() !== month) return;
    const day = date.getDate();
    const existing = schedulesByDay.get(day) ?? [];
    existing.push(schedule);
    schedulesByDay.set(day, existing);
  });

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="grid grid-cols-7 gap-1 text-xs">
      {WEEKDAY_LABELS.map(label => (
        <div key={label} className="text-center font-bold text-text-secondary py-1">{label}</div>
      ))}
      {cells.map((day, idx) => (
        <div
          key={idx}
          className={`min-h-16 rounded border p-1 flex flex-col gap-0.5 ${day ? 'border-border-color bg-surface' : 'border-transparent'}`}
        >
          {day && (
            <>
              <span className="text-text-secondary font-mono">{day}</span>
              {(schedulesByDay.get(day) ?? []).map(schedule => (
                <span
                  key={schedule.id}
                  title={schedule.prompt}
                  className="truncate bg-primary/10 text-primary text-[9px] font-bold px-1 rounded"
                >
                  {schedule.agentName ?? 'Agente'}
                </span>
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
};
