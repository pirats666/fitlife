import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TelegramUser } from './telegram-auth.js';

export type FitLifeUser = TelegramUser & {
  role: 'client' | 'trainer';
  onboardingCompleted: boolean;
  goal?: 'health' | 'strength' | 'fitness';
  createdAt: string;
  updatedAt: string;
};

export type WorkoutHistoryItem = { workoutId: string; completedAt: string };
export type ClientAssignment = { clientId: number; trainerId: number; assignedAt: string };

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

const db: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

function configuredTrainerIds(): Set<number> {
  return new Set((process.env.TRAINER_TELEGRAM_IDS ?? '').split(',').map(Number).filter(Number.isSafeInteger));
}

function mapUser(row: any): FitLifeUser {
  return {
    id: Number(row.telegram_id),
    first_name: row.first_name,
    ...(row.last_name ? { last_name: row.last_name } : {}),
    ...(row.username ? { username: row.username } : {}),
    ...(row.language_code ? { language_code: row.language_code } : {}),
    ...(row.photo_url ? { photo_url: row.photo_url } : {}),
    role: row.role,
    onboardingCompleted: row.onboarding_completed,
    ...(row.goal ? { goal: row.goal } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function upsertUser(telegramUser: TelegramUser): Promise<FitLifeUser> {
  const { data: existing, error: readError } = await db.from('users').select('*').eq('telegram_id', telegramUser.id).maybeSingle();
  if (readError) throw readError;
  const role = configuredTrainerIds().has(telegramUser.id) ? 'trainer' : (existing?.role ?? 'client');
  const { data, error } = await db.from('users').upsert({
    telegram_id: telegramUser.id,
    first_name: telegramUser.first_name,
    last_name: telegramUser.last_name ?? null,
    username: telegramUser.username ?? null,
    language_code: telegramUser.language_code ?? null,
    photo_url: telegramUser.photo_url ?? null,
    role,
    onboarding_completed: existing?.onboarding_completed ?? false,
    goal: existing?.goal ?? null,
  }, { onConflict: 'telegram_id' }).select('*').single();
  if (error) throw error;
  return mapUser(data);
}

export async function getUser(id: number): Promise<FitLifeUser | undefined> {
  const { data, error } = await db.from('users').select('*').eq('telegram_id', id).maybeSingle();
  if (error) throw error;
  return data ? mapUser(data) : undefined;
}

export async function isTrainer(id: number): Promise<boolean> {
  if (configuredTrainerIds().has(id)) return true;
  const user = await getUser(id);
  return user?.role === 'trainer';
}

export async function updateUser(id: number, patch: Partial<Pick<FitLifeUser, 'goal' | 'onboardingCompleted'>>): Promise<FitLifeUser | undefined> {
  const values: Record<string, unknown> = {};
  if (patch.goal !== undefined) values.goal = patch.goal;
  if (patch.onboardingCompleted !== undefined) values.onboarding_completed = patch.onboardingCompleted;
  if (!Object.keys(values).length) return getUser(id);
  const { data, error } = await db.from('users').update(values).eq('telegram_id', id).select('*').maybeSingle();
  if (error) throw error;
  return data ? mapUser(data) : undefined;
}

export async function completeWorkout(userId: number, workoutId: string): Promise<WorkoutHistoryItem[] | undefined> {
  const user = await getUser(userId);
  if (!user) return undefined;
  const { error } = await db.from('workout_history').insert({ telegram_id: userId, workout_id: workoutId });
  if (error) throw error;
  return getWorkoutHistory(userId);
}

export async function getWorkoutHistory(userId: number): Promise<WorkoutHistoryItem[] | undefined> {
  const user = await getUser(userId);
  if (!user) return undefined;
  const { data, error } = await db.from('workout_history').select('workout_id, completed_at').eq('telegram_id', userId).order('completed_at', { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => ({ workoutId: row.workout_id, completedAt: row.completed_at }));
}

export async function assignClient(trainerId: number, clientId: number): Promise<ClientAssignment | undefined> {
  if (!(await isTrainer(trainerId))) return undefined;
  const client = await getUser(clientId);
  if (!client || client.role !== 'client') return undefined;
  const { data, error } = await db.from('trainer_clients').upsert({ client_id: clientId, trainer_id: trainerId }, { onConflict: 'client_id' }).select('*').single();
  if (error) throw error;
  return { clientId: data.client_id, trainerId: data.trainer_id, assignedAt: data.assigned_at };
}

export async function getTrainerClients(trainerId: number): Promise<FitLifeUser[]> {
  const { data, error } = await db.from('trainer_clients').select('client_id, users!trainer_clients_client_id_fkey(*)').eq('trainer_id', trainerId);
  if (error) throw error;
  return (data ?? []).map((row: any) => row.users).filter(Boolean).map(mapUser);
}

export async function isClientAssigned(trainerId: number, clientId: number): Promise<boolean> {
  const { data, error } = await db.from('trainer_clients').select('client_id').eq('trainer_id', trainerId).eq('client_id', clientId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function getClientTrainer(clientId: number): Promise<FitLifeUser | undefined> {
  const { data, error } = await db.from('trainer_clients').select('trainer_id, users!trainer_clients_trainer_id_fkey(*)').eq('client_id', clientId).maybeSingle();
  if (error) throw error;
  return data?.users ? mapUser(data.users) : undefined;
}

export async function getClientScheduleRows(clientId: number) {
  const { data, error } = await db.from('client_schedules').select('*').eq('client_id', clientId).order('day', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function replaceClientSchedule(trainerId: number, clientId: number, items: Array<{ day: number; workoutId: string | null }>) {
  if (!(await isClientAssigned(trainerId, clientId))) return undefined;
  const now = new Date().toISOString();
  const rows = items.map((item) => ({ client_id: clientId, day: item.day, workout_id: item.workoutId, assigned_by: trainerId, assigned_at: now }));
  const { error: deleteError } = await db.from('client_schedules').delete().eq('client_id', clientId);
  if (deleteError) throw deleteError;
  if (rows.length) {
    const { error } = await db.from('client_schedules').insert(rows);
    if (error) throw error;
  }
  return getClientScheduleRows(clientId);
}
