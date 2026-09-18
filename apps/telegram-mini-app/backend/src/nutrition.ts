import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function listClientNutritionPlans(clientId: string) {
  const { data, error } = await db.from('nutrition_plans').select('*')
    .eq('client_id', clientId).order('version', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createClientNutritionPlan(clientId: string, input: Record<string, unknown>) {
  const allowed = [
    'name','goal','calories','protein_g','fat_g','carbs_g','instructions',
    'version','status','starts_on','ends_on'
  ];
  const payload = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key)));
  if (!payload.name) throw new Error('name is required');

  if (payload.version == null) {
    const { data: latest } = await db.from('nutrition_plans').select('version')
      .eq('client_id', clientId).order('version', { ascending: false }).limit(1).maybeSingle();
    payload.version = (latest?.version ?? 0) + 1;
  }

  const { data, error } = await db.from('nutrition_plans')
    .insert({ client_id: clientId, ...payload }).select('*').single();
  if (error) throw error;
  return data;
}

export async function setNutritionPlanStatus(clientId: string, planId: string, status: 'draft' | 'active' | 'completed' | 'archived') {
  const { data, error } = await db.from('nutrition_plans').update({ status })
    .eq('id', planId).eq('client_id', clientId).select('*').single();
  if (error) throw error;
  return data;
}
