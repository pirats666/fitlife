import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function listClientNotes(clientId: string) {
  const { data, error } = await db.from('client_notes').select('*')
    .eq('client_id', clientId).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createClientNote(clientId: string, note: string) {
  const value = note.trim();
  if (!value) throw new Error('Note cannot be empty');
  if (value.length > 5000) throw new Error('Note is too long');
  const { data, error } = await db.from('client_notes')
    .insert({ client_id: clientId, note: value }).select('*').single();
  if (error) throw error;
  return data;
}
