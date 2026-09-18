import { supabase } from './supabase.js';

export async function getClientTrainingSessions(clientId: string) {
  const { data: days, error: daysError } = await supabase
    .from('workout_days')
    .select('id, program_id, day_number, title, notes, training_programs!inner(id, client_id, name, version, status)')
    .eq('training_programs.client_id', clientId)
    .order('day_number', { ascending: true });

  if (daysError) throw new Error(daysError.message);

  const dayIds = (days ?? []).map((day: { id: string }) => day.id);
  const { data: exercises, error: exercisesError } = dayIds.length
    ? await supabase.from('workout_exercises').select('*').in('workout_day_id', dayIds).order('sort_order', { ascending: true })
    : { data: [], error: null };

  if (exercisesError) throw new Error(exercisesError.message);

  const { data: logs, error: logsError } = await supabase
    .from('training_logs')
    .select('*')
    .eq('client_id', clientId)
    .order('performed_at', { ascending: false });

  if (logsError) throw new Error(logsError.message);

  return {
    workouts: (days ?? []).map((day) => ({
      ...day,
      exercises: (exercises ?? []).filter((exercise) => exercise.workout_day_id === day.id),
    })),
    history: logs ?? [],
  };
}

async function assertWorkoutDayBelongsToClient(clientId: string, workoutDayId: string) {
  const { data, error } = await supabase
    .from('workout_days')
    .select('id, training_programs!inner(client_id)')
    .eq('id', workoutDayId)
    .eq('training_programs.client_id', clientId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Workout day not found for client');
}

export async function logTrainingSession(
  clientId: string,
  input: {
    workout_day_id: string;
    performed_at?: string;
    duration_minutes?: number | null;
    rpe?: number | null;
    notes?: string | null;
  },
) {
  if (!input.workout_day_id) throw new Error('workout_day_id is required');
  await assertWorkoutDayBelongsToClient(clientId, input.workout_day_id);

  const { data, error } = await supabase
    .from('training_logs')
    .insert({
      client_id: clientId,
      workout_day_id: input.workout_day_id,
      performed_at: input.performed_at ?? new Date().toISOString(),
      duration_minutes: input.duration_minutes ?? null,
      rpe: input.rpe ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
