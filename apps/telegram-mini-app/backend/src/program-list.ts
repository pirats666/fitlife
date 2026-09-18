import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export async function listClientPrograms(clientId: string) {
  const { data: programs, error } = await db
    .from('training_programs')
    .select('*')
    .eq('client_id', clientId)
    .order('version', { ascending: false });
  if (error) throw error;
  return programs ?? [];
}

export async function setProgramStatus(clientId: string, programId: string, status: 'active' | 'draft' | 'completed' | 'archived') {
  const { data, error } = await db
    .from('training_programs')
    .update({ status })
    .eq('id', programId)
    .eq('client_id', clientId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
