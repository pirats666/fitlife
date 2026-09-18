import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function listClientPayments(clientId: string) {
  const { data, error } = await db.from('payment_records').select('*')
    .eq('client_id', clientId).order('paid_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createClientPayment(clientId: string, input: Record<string, unknown>) {
  const allowed = [
    'paid_at','amount','currency','package_name','sessions_purchased','sessions_used',
    'valid_from','valid_until','status','comment'
  ];
  const payload = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key)));
  if (typeof payload.amount !== 'number' || payload.amount <= 0) throw new Error('amount must be greater than 0');
  if (payload.sessions_purchased != null && (!Number.isInteger(payload.sessions_purchased) || Number(payload.sessions_purchased) < 0)) {
    throw new Error('sessions_purchased must be a non-negative integer');
  }
  if (payload.sessions_used != null && (!Number.isInteger(payload.sessions_used) || Number(payload.sessions_used) < 0)) {
    throw new Error('sessions_used must be a non-negative integer');
  }

  const { data, error } = await db.from('payment_records')
    .insert({ client_id: clientId, ...payload }).select('*').single();
  if (error) throw error;
  return data;
}

export async function updatePaymentUsage(clientId: string, paymentId: string, sessionsUsed: number) {
  if (!Number.isInteger(sessionsUsed) || sessionsUsed < 0) throw new Error('sessions_used must be a non-negative integer');
  const { data, error } = await db.from('payment_records')
    .update({ sessions_used: sessionsUsed }).eq('id', paymentId).eq('client_id', clientId)
    .select('*').single();
  if (error) throw error;
  return data;
}
