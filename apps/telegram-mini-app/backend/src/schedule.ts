export type ScheduleDay = {
  day: number;
  label: string;
  workoutId: string | null;
};

export const weeklySchedule: ScheduleDay[] = [
  { day: 1, label: 'Понедельник', workoutId: 'open-workout-1' },
  { day: 2, label: 'Вторник', workoutId: null },
  { day: 3, label: 'Среда', workoutId: 'open-workout-1' },
  { day: 4, label: 'Четверг', workoutId: null },
  { day: 5, label: 'Пятница', workoutId: 'open-workout-1' },
  { day: 6, label: 'Суббота', workoutId: null },
  { day: 7, label: 'Воскресенье', workoutId: null }
];

export function getWeeklySchedule() {
  return weeklySchedule;
}
