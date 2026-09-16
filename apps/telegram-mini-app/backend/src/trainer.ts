import { getUser, getTrainerClients } from './store.js';
import type { Workout } from './workouts.js';

export type ClientScheduleItem = {
  day: number;
  label: string;
  workoutId: string | null;
  assignedBy: number;
  assignedAt: string;
};

const schedules = new Map<number, ClientScheduleItem[]>();

const labels = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export function getClientSchedule(clientId: number): ClientScheduleItem[] {
  return schedules.get(clientId) ?? labels.map((label, index) => ({ day: index + 1, label, workoutId: null, assignedBy: 0, assignedAt: '' }));
}

export function setClientSchedule(
  trainerId: number,
  clientId: number,
  items: Array<{ day: number; workoutId: string | null }>,
  workouts: Workout[],
): ClientScheduleItem[] | undefined {
  const trainer = getUser(trainerId);
  const client = getUser(clientId);
  if (!trainer || trainer.role !== 'trainer' || !client || client.role !== 'client') return undefined;
  if (!getTrainerClients(trainerId).some((item) => item.id === clientId)) return undefined;

  const seenDays = new Set<number>();
  for (const item of items) {
    if (!Number.isInteger(item.day) || item.day < 1 || item.day > 7) throw new Error('Invalid schedule day');
    if (seenDays.has(item.day)) throw new Error('Duplicate schedule day');
    seenDays.add(item.day);
    if (item.workoutId && !workouts.some((workout) => workout.id === item.workoutId)) {
      throw new Error('Workout not found');
    }
  }

  const now = new Date().toISOString();
  const normalized = labels.map((label, index) => {
    const day = index + 1;
    const requested = items.find((item) => item.day === day);
    return {
      day,
      label,
      workoutId: requested?.workoutId ?? null,
      assignedBy: trainerId,
      assignedAt: now,
    };
  });

  schedules.set(clientId, normalized);
  return normalized;
}
