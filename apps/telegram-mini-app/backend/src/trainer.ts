import { getClientScheduleRows, getUser, isClientAssigned, replaceClientSchedule } from './store.js';
import type { Workout } from './workouts.js';

export type ClientScheduleItem = {
  day: number;
  label: string;
  workoutId: string | null;
  assignedBy: number;
  assignedAt: string;
};

const labels = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export async function getClientSchedule(clientId: number): Promise<ClientScheduleItem[]> {
  const rows = await getClientScheduleRows(clientId);
  const byDay = new Map(rows.map((row: any) => [row.day, row]));
  return labels.map((label, index) => {
    const row = byDay.get(index + 1);
    return { day: index + 1, label, workoutId: row?.workout_id ?? null, assignedBy: row?.assigned_by ?? 0, assignedAt: row?.assigned_at ?? '' };
  });
}

export async function setClientSchedule(
  trainerId: number,
  clientId: number,
  items: Array<{ day: number; workoutId: string | null }>,
  workouts: Workout[],
): Promise<ClientScheduleItem[] | undefined> {
  const trainer = await getUser(trainerId);
  const client = await getUser(clientId);
  if (!trainer || trainer.role !== 'trainer' || !client || client.role !== 'client') return undefined;
  if (!(await isClientAssigned(trainerId, clientId))) return undefined;

  const seenDays = new Set<number>();
  for (const item of items) {
    if (!Number.isInteger(item.day) || item.day < 1 || item.day > 7) throw new Error('Invalid schedule day');
    if (seenDays.has(item.day)) throw new Error('Duplicate schedule day');
    seenDays.add(item.day);
    if (item.workoutId && !workouts.some((workout) => workout.id === item.workoutId)) throw new Error('Workout not found');
  }

  const normalized = labels.map((_, index) => {
    const day = index + 1;
    const requested = items.find((item) => item.day === day);
    return { day, workoutId: requested?.workoutId ?? null };
  });
  await replaceClientSchedule(trainerId, clientId, normalized);
  return getClientSchedule(clientId);
}
