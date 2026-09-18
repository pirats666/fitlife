import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { QuizExperience, QuizGoal, QuizLocation, ProgramSlug } from './quiz.js';

const db: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

export async function createQuizResult(telegramId: number, goal: QuizGoal, location: QuizLocation, experience: QuizExperience, program: ProgramSlug, source?: string, campaign?: string) {
  const { data, error } = await db.from('quiz_results').insert({ telegram_id: telegramId, goal, location, experience, recommended_program: program, source: source ?? null, campaign: campaign ?? null, completed_at: new Date().toISOString() }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function getLatestQuizResult(telegramId: number) {
  const { data, error } = await db.from('quiz_results').select('id,goal,location,experience,recommended_program,source,campaign,completed_at,program_downloaded_at,followup_eligible_at,followup_1_sent_at,followup_2_sent_at').eq('telegram_id', telegramId).order('completed_at', { ascending: false, nullsFirst: false }).order('started_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProgramPdfUrl(slug: ProgramSlug) {
  const { data, error } = await db.from('programs').select('pdf_url').eq('slug', slug).eq('active', true).maybeSingle();
  if (error) throw error;
  return (data?.pdf_url as string | null | undefined) ?? undefined;
}

export async function event(telegramId: number, eventName: string, quizResultId?: string, source?: string, campaign?: string) {
  const { error } = await db.from('funnel_events').insert({ telegram_id: telegramId, event_name: eventName, quiz_result_id: quizResultId ?? null, source: source ?? null, campaign: campaign ?? null });
  if (error) throw error;
}

export async function markProgramRequested(id: string) { await db.from('quiz_results').update({ program_requested_at: new Date().toISOString() }).eq('id', id); }
export async function markProgramDownloaded(id: string) { const now = new Date().toISOString(); await db.from('quiz_results').update({ program_downloaded_at: now, followup_eligible_at: now }).eq('id', id); }
export async function markTrainerClicked(id: string) { await db.from('quiz_results').update({ trainer_clicked_at: new Date().toISOString() }).eq('id', id); }

export async function getDueFollowups(now = new Date()) {
  const firstCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const secondCutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db.from('quiz_results')
    .select('id,telegram_id,goal,location,experience,recommended_program,followup_eligible_at,followup_1_sent_at,followup_2_sent_at')
    .not('followup_eligible_at', 'is', null)
    .or(`and(followup_1_sent_at.is.null,followup_eligible_at.lte.${firstCutoff}),and(followup_2_sent_at.is.null,followup_eligible_at.lte.${secondCutoff})`)
    .order('followup_eligible_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function markFollowupSent(id: string, step: 1 | 2) {
  const column = step === 1 ? 'followup_1_sent_at' : 'followup_2_sent_at';
  const { error } = await db.from('quiz_results').update({ [column]: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
