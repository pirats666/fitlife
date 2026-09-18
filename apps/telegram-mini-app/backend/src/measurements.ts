import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function listClientMeasurements(clientId: string) {
  const { data, error } = await db.from('measurements').select('*')
    .eq('client_id', clientId).order('measured_on', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createClientMeasurement(clientId: string, input: Record<string, unknown>) {
  const allowed = [
    'measured_on','body_weight_kg','chest_cm','waist_cm','hips_cm','arm_cm',
    'thigh_cm','body_fat_percent','other','photo_urls','notes'
  ];
  const payload = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key)));
  const { data, error } = await db.from('measurements')
    .insert({ client_id: clientId, ...payload }).select('*').single();
  if (error) throw error;
  return data;
}
