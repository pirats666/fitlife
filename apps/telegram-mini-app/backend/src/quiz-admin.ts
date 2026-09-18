import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
const db: SupabaseClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function countEvents(eventName: string) {
  const { count: result, error } = await db.from('funnel_events').select('*', { count: 'exact', head: true }).eq('event_name', eventName);
  if (error) throw error;
  return result ?? 0;
}

async function count(table: string, column?: string) {
  let query = db.from(table).select('*', { count: 'exact', head: true });
  if (column) query = query.not(column, 'is', null);
  const { count: result, error } = await query;
  if (error) throw error;
  return result ?? 0;
}

export async function getQuizAdminStats() {
  const [users, testsCompleted, programDownloads, offerShown, trainerClicks] = await Promise.all([
    count('users'),
    count('quiz_results', 'completed_at'),
    count('quiz_results', 'program_downloaded_at'),
    countEvents('OFFER_SHOWN'),
    count('quiz_results', 'trainer_clicked_at'),
  ]);

  const { data: goals, error: goalsError } = await db.from('quiz_results').select('goal');
  if (goalsError) throw goalsError;
  const { data: programs, error: programsError } = await db.from('quiz_results').select('recommended_program');
  if (programsError) throw programsError;
  const { data: sources, error: sourcesError } = await db.from('quiz_results').select('source, campaign');
  if (sourcesError) throw sourcesError;

  const tally = (rows: Array<Record<string, unknown>>, key: string) => rows.reduce<Record<string, number>>((acc, row) => {
    const value = String(row[key] ?? 'unknown');
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

  const sourceTally = (rows: Array<Record<string, unknown>>) => rows.reduce<Record<string, number>>((acc, row) => {
    const source = String(row.source ?? 'organic');
    const campaign = row.campaign ? String(row.campaign) : '';
    const key = campaign ? `${source}:${campaign}` : source;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    users,
    testsCompleted,
    programDownloads,
    offerShown,
    trainerClicks,
    goals: tally(goals ?? [], 'goal'),
    programs: tally(programs ?? [], 'recommended_program'),
    sources: sourceTally(sources ?? []),
  };
}

export function formatQuizAdminStats(stats: Awaited<ReturnType<typeof getQuizAdminStats>>) {
  const section = (title: string, values: Record<string, number>) => {
    const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
    return `${title}\n${entries.length ? entries.map(([key, value]) => `• ${key}: ${value}`).join('\n') : '• пока нет данных'}`;
  };

  return [
    '📊 Pavel Fitness — статистика',
    '',
    `👥 Пользователи: ${stats.users}`,
    `✅ Тесты завершены: ${stats.testsCompleted}`,
    `📥 Программы скачаны: ${stats.programDownloads}`,
    `🎯 Оффер индивидуальной работы: ${stats.offerShown}`,
    `💬 Переходы к тренеру: ${stats.trainerClicks}`,
    '',
    section('🎯 Цели', stats.goals),
    '',
    section('📄 Программы', stats.programs),
    '',
    section('🔗 Источники / кампании', stats.sources),
  ].join('\n');
}
