import { supabase } from './supabase.js';

export async function logExercisePerformance(input: {
  client_id: string;
  workout_exercise_id?: string | null;
  exercise_name: string;
  performed_at?: string;
  sets?: number | null;
  reps?: number | null;
  weight_kg?: number | null;
  estimated_1rm_kg?: number | null;
  notes?: string | null;
}) {
  if (!input.exercise_name?.trim()) throw new Error('exercise_name is required');
  const { data, error } = await supabase.from('exercise_performance_logs').insert({
    client_id: input.client_id,
    workout_exercise_id: input.workout_exercise_id ?? null,
    exercise_name: input.exercise_name.trim(),
    performed_at: input.performed_at ?? new Date().toISOString(),
    sets: input.sets ?? null,
    reps: input.reps ?? null,
    weight_kg: input.weight_kg ?? null,
    estimated_1rm_kg: input.estimated_1rm_kg ?? null,
    notes: input.notes ?? null,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getExerciseProgression(clientId: string, exerciseName?: string) {
  let query = supabase.from('exercise_performance_logs').select('*')
    .eq('client_id', clientId).order('performed_at', { ascending: false }).limit(100);
  if (exerciseName?.trim()) query = query.eq('exercise_name', exerciseName.trim());

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  const byExercise = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.exercise_name;
    if (!byExercise.has(key)) byExercise.set(key, []);
    byExercise.get(key)!.push(row);
  }

  return Array.from(byExercise.entries()).map(([name, history]) => {
    const ordered = [...history].sort((a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime());
    const first = ordered.find((x) => typeof x.weight_kg === 'number' || typeof x.estimated_1rm_kg === 'number');
    const latest = [...ordered].reverse().find((x) => typeof x.weight_kg === 'number' || typeof x.estimated_1rm_kg === 'number');
    const start = first?.weight_kg ?? first?.estimated_1rm_kg ?? null;
    const current = latest?.weight_kg ?? latest?.estimated_1rm_kg ?? null;
    return {
      exercise_name: name,
      start_kg: start,
      current_kg: current,
      change_kg: start !== null && current !== null ? Number((current - start).toFixed(2)) : null,
      history: ordered,
    };
  });
}
