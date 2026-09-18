import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false }
});

type ExerciseInput = {
  exercise_id?: string | null;
  exercise_name: string;
  sort_order?: number;
  sets?: number | null;
  reps?: string | null;
  working_weight?: number | null;
  rest_seconds?: number | null;
  tempo?: string | null;
  rpe?: number | null;
  rir?: number | null;
  coach_comment?: string | null;
  media_url?: string | null;
};

type DayInput = {
  day_number: number;
  title: string;
  notes?: string | null;
  exercises: ExerciseInput[];
};

export async function createTrainingProgram(clientId: string, input: {
  name: string;
  goal?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  rationale?: string | null;
  days: DayInput[];
}) {
  if (!input.name.trim()) throw new Error('Program name is required');
  if (!Array.isArray(input.days) || input.days.length === 0) throw new Error('At least one workout day is required');

  const { data: latest, error: latestError } = await db
    .from('training_programs').select('version').eq('client_id', clientId)
    .order('version', { ascending: false }).limit(1).maybeSingle();
  if (latestError) throw latestError;

  const version = (latest?.version ?? 0) + 1;
  const { data: program, error: programError } = await db.from('training_programs').insert({
    client_id: clientId,
    name: input.name.trim(),
    goal: input.goal ?? null,
    version,
    status: 'active',
    starts_on: input.starts_on ?? null,
    ends_on: input.ends_on ?? null,
    rationale: input.rationale ?? null
  }).select('*').single();
  if (programError) throw programError;

  const dayRows = input.days.map((day, index) => ({
    program_id: program.id,
    day_number: day.day_number || index + 1,
    title: day.title.trim() || `Тренировка ${index + 1}`,
    notes: day.notes ?? null
  }));
  const { data: days, error: daysError } = await db.from('workout_days').insert(dayRows).select('*').order('day_number');
  if (daysError) throw daysError;

  const exerciseRows = days.flatMap((day: any, index: number) =>
    (input.days[index]?.exercises ?? []).map((exercise, exerciseIndex) => ({
      workout_day_id: day.id,
      exercise_id: exercise.exercise_id ?? null,
      exercise_name: exercise.exercise_name.trim(),
      sort_order: exercise.sort_order ?? exerciseIndex + 1,
      sets: exercise.sets ?? null,
      reps: exercise.reps ?? null,
      working_weight: exercise.working_weight ?? null,
      rest_seconds: exercise.rest_seconds ?? null,
      tempo: exercise.tempo ?? null,
      rpe: exercise.rpe ?? null,
      rir: exercise.rir ?? null,
      coach_comment: exercise.coach_comment ?? null,
      media_url: exercise.media_url ?? null
    }))
  );

  if (exerciseRows.some(row => !row.exercise_name)) throw new Error('Exercise name is required');
  if (exerciseRows.length) {
    const { error } = await db.from('workout_exercises').insert(exerciseRows);
    if (error) throw error;
  }

  return getTrainingProgram(program.id);
}

export async function getTrainingProgram(programId: string) {
  const { data: program, error } = await db.from('training_programs').select('*').eq('id', programId).single();
  if (error) return undefined;
  const { data: days, error: daysError } = await db.from('workout_days').select('*').eq('program_id', programId).order('day_number');
  if (daysError) throw daysError;

  const dayIds = (days ?? []).map((day: any) => day.id);
  const { data: exercises, error: exercisesError } = dayIds.length
    ? await db.from('workout_exercises').select('*').in('workout_day_id', dayIds).order('sort_order')
    : { data: [], error: null };
  if (exercisesError) throw exercisesError;

  return {
    ...program,
    days: (days ?? []).map((day: any) => ({
      ...day,
      exercises: (exercises ?? []).filter((exercise: any) => exercise.workout_day_id === day.id)
    }))
  };
}
