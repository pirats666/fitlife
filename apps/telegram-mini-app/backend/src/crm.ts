import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function listCrmClients() {
  const { data, error } = await db.from('clients').select('*').neq('status', 'archived').order('updated_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map(enrichClient));
}

async function enrichClient(client: any) {
  const [programs, nutrition, payments, measurement] = await Promise.all([
    db.from('training_programs').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('status', 'active'),
    db.from('nutrition_plans').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('status', 'active'),
    db.from('payment_records').select('sessions_purchased,sessions_used').eq('client_id', client.id).eq('status', 'active'),
    db.from('measurements').select('measured_on').eq('client_id', client.id).order('measured_on', { ascending: false }).limit(1)
  ]);
  for (const result of [programs, nutrition, payments, measurement]) if (result.error) throw result.error;
  const sessionsRemaining = (payments.data ?? []).reduce(
    (sum: number, p: any) => sum + Math.max(0, (p.sessions_purchased ?? 0) - (p.sessions_used ?? 0)), 0
  );
  return {
    ...client,
    active_program_count: programs.count ?? 0,
    active_nutrition_plan_count: nutrition.count ?? 0,
    sessions_remaining: sessionsRemaining,
    last_measurement_at: measurement.data?.[0]?.measured_on ?? null
  };
}

export async function getCrmClient(id: string) {
  const { data, error } = await db.from('clients').select('*').eq('id', id).single();
  if (error) return undefined;
  return enrichClient(data);
}

export async function createCrmClient(input: Record<string, unknown>) {
  const allowed = [
    'telegram_id','telegram_username','first_name','last_name','phone','status','goal','goal_details',
    'training_experience','age','training_location','equipment','training_days_per_week',
    'session_duration_minutes','movement_limitations','recovery_notes','coach_notes'
  ];
  const payload = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key)));
  if (!payload.first_name) throw new Error('first_name is required');
  const { data, error } = await db.from('clients').insert(payload).select('*').single();
  if (error) throw error;
  return enrichClient(data);
}

export async function updateCrmClient(id: string, input: Record<string, unknown>) {
  const allowed = [
    'telegram_id','telegram_username','first_name','last_name','phone','status','goal','goal_details',
    'training_experience','age','training_location','equipment','training_days_per_week',
    'session_duration_minutes','movement_limitations','recovery_notes','coach_notes'
  ];
  const payload = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key)));
  const { data, error } = await db.from('clients').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return enrichClient(data);
}

export async function addClientNote(clientId: string, note: string) {
  if (!note.trim()) throw new Error('note is required');
  const { data, error } = await db.from('client_notes').insert({ client_id: clientId, note: note.trim() }).select('*').single();
  if (error) throw error;
  return data;
}

export async function addMeasurement(clientId: string, input: Record<string, unknown>) {
  const { data, error } = await db.from('measurements').insert({ client_id: clientId, ...input }).select('*').single();
  if (error) throw error;
  return data;
}

export async function addPayment(clientId: string, input: Record<string, unknown>) {
  const { data, error } = await db.from('payment_records').insert({ client_id: clientId, ...input }).select('*').single();
  if (error) throw error;
  return data;
}
