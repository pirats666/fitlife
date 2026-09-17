import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { QuizExperience, QuizGoal, QuizLocation, ProgramSlug } from './quiz.js';

const db: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

export async function createQuizResult(telegramId: number, goal: QuizGoal, location: QuizLocation, experience: QuizExperience, program: ProgramSlug, source?: string, campaign?: string) {
  const { data, error } = await db.from('quiz_results').insert({ telegram_id: telegramId, goal, location, experience, recommended_program: program, source: source ?? null, campaign: campaign ?? null, completed_at: new Date().toISOString() }).select('id').single();
  if (error) throw error;
  return data.id as string;
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
export async function markProgramDownloaded(id: string) { await db.from('quiz_results').update({ program_downloaded_at: new Date().toISOString() }).eq('id', id); }
export async function markTrainerClicked(id: string) { await db.from('quiz_results').update({ trainer_clicked_at: new Date().toISOString() }).eq('id', id); }
