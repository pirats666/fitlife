import { supabase } from './supabase.js';

export async function getClientProgress(clientId: string) {
  const { data: logs, error: logsError } = await supabase
    .from('training_logs')
    .select('id, workout_day_id, performed_at, duration_minutes, rpe, notes')
    .eq('client_id', clientId)
    .order('performed_at', { ascending: false });
  if (logsError) throw new Error(logsError.message);

  const { data: measurements, error: measurementsError } = await supabase
    .from('measurements')
    .select('*')
    .eq('client_id', clientId)
    .order('measured_on', { ascending: false });
  if (measurementsError) throw new Error(measurementsError.message);

  const totalWorkouts = logs?.length ?? 0;
  const now = new Date();
  const weekStart = new Date(now);
  const day = weekStart.getDay() || 7;
  weekStart.setDate(weekStart.getDate() - day + 1);
  weekStart.setHours(0, 0, 0, 0);

  const completedThisWeek = (logs ?? []).filter(
    (item) => new Date(item.performed_at) >= weekStart,
  ).length;

  const latest = measurements?.[0] ?? null;
  const previous = measurements?.[1] ?? null;

  const delta = (key: string) => {
    const current = latest?.[key];
    const old = previous?.[key];
    if (typeof current !== 'number' || typeof old !== 'number') return null;
    return Number((current - old).toFixed(2));
  };

  return {
    summary: {
      totalWorkouts,
      completedThisWeek,
      lastWorkoutAt: logs?.[0]?.performed_at ?? null,
      latestMeasurementAt: latest?.measured_on ?? null,
    },
    measurements: measurements ?? [],
    changes: {
      body_weight_kg: delta('body_weight_kg'),
      chest_cm: delta('chest_cm'),
      waist_cm: delta('waist_cm'),
      hips_cm: delta('hips_cm'),
      arm_cm: delta('arm_cm'),
      thigh_cm: delta('thigh_cm'),
      body_fat_percent: delta('body_fat_percent'),
    },
  };
}
