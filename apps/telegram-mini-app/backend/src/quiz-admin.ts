import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
const db: SupabaseClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const goalLabels: Record<string, string> = {
  weight_loss: '🔥 Похудеть',
  muscle_gain: '💪 Набрать мышечную массу',
  fitness: '🏃 Форма и выносливость',
  strength: '🧱 Стать сильнее',
};
const locationLabels: Record<string, string> = { home: '🏠 Дома', outdoor: '🌳 Спортплощадка', gym: '🏋️ В зале' };
const experienceLabels: Record<string, string> = { beginner: '🌱 Новичок', returning: '🔄 После перерыва', regular: '💪 Регулярно' };
const programLabels: Record<string, string> = {
  full_body_home: 'FULL BODY HOME',
  outdoor_full_body: 'OUTDOOR FULL BODY',
  three_day_split: '3-DAY SPLIT',
  full_body_beginner: 'FULL BODY — новичок',
};

function label(map: Record<string, string>, value: unknown) {
  return map[String(value ?? '')] ?? String(value ?? 'Не указано');
}
async function countEvents(eventName: string) {
  const { count, error } = await db.from('funnel_events').select('*', { count: 'exact', head: true }).eq('event_name', eventName);
  if (error) throw error;
  return count ?? 0;
}
async function count(table: string, column?: string) {
  let query = db.from(table).select('*', { count: 'exact', head: true });
  if (column) query = query.not(column, 'is', null);
  const { count: result, error } = await query;
  if (error) throw error;
  return result ?? 0;
}
function tally(rows: Array<Record<string, unknown>>, key: string) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const value = String(row[key] ?? 'unknown');
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}
function sourceTally(rows: Array<Record<string, unknown>>) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const source = String(row.source ?? 'organic');
    const campaign = row.campaign ? String(row.campaign) : '';
    const key = campaign ? `${source} / ${campaign}` : source;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}
function percent(value: number, total: number) {
  return total ? `${Math.round((value / total) * 100)}%` : '0%';
}

export async function getQuizAdminStats() {
  const [users, starts, testsCompleted, programDownloads, offerShown] = await Promise.all([
    count('users'),
    countEvents('START'),
    count('quiz_results', 'completed_at'),
    count('quiz_results', 'program_downloaded_at'),
    countEvents('OFFER_SHOWN'),
  ]);
  const [quizRowsResult, locationRowsResult, experienceRowsResult, programRowsResult, sourceRowsResult, offerRowsResult] = await Promise.all([
    db.from('quiz_results').select('telegram_id, goal'),
    db.from('quiz_results').select('location'),
    db.from('quiz_results').select('experience'),
    db.from('quiz_results').select('recommended_program'),
    db.from('quiz_results').select('source, campaign'),
    db.from('funnel_events').select('telegram_id').eq('event_name', 'OFFER_SHOWN'),
  ]);
  for (const result of [quizRowsResult, locationRowsResult, experienceRowsResult, programRowsResult, sourceRowsResult, offerRowsResult]) {
    if (result.error) throw result.error;
  }
  const uniqueTestUsers = new Set((quizRowsResult.data ?? []).map((row) => Number(row.telegram_id))).size;
  const uniqueOfferUsers = new Set((offerRowsResult.data ?? []).map((row) => Number(row.telegram_id))).size;
  return {
    users, starts, testsCompleted, programDownloads, offerShown, uniqueTestUsers, uniqueOfferUsers,
    conversion: {
      startToTest: percent(testsCompleted, starts),
      testToDownload: percent(programDownloads, testsCompleted),
      downloadToOffer: percent(uniqueOfferUsers, programDownloads),
      testToOffer: percent(uniqueOfferUsers, uniqueTestUsers),
    },
    goals: tally(quizRowsResult.data ?? [], 'goal'),
    locations: tally(locationRowsResult.data ?? [], 'location'),
    experiences: tally(experienceRowsResult.data ?? [], 'experience'),
    programs: tally(programRowsResult.data ?? [], 'recommended_program'),
    sources: sourceTally(sourceRowsResult.data ?? []),
  };
}

export async function getRecentLeads(limit = 8) {
  const { data: events, error: eventsError } = await db.from('funnel_events')
    .select('telegram_id, quiz_result_id, created_at').eq('event_name', 'OFFER_SHOWN')
    .order('created_at', { ascending: false }).limit(limit);
  if (eventsError) throw eventsError;
  const rows = events ?? [];
  const resultIds = rows.map((row) => row.quiz_result_id).filter(Boolean);
  let results: Array<Record<string, unknown>> = [];
  if (resultIds.length) {
    const { data, error } = await db.from('quiz_results')
      .select('id, telegram_id, goal, location, experience, recommended_program, source, campaign, completed_at')
      .in('id', resultIds);
    if (error) throw error;
    results = data ?? [];
  }
  const telegramIds = [...new Set(rows.map((row) => Number(row.telegram_id)))];
  const usersById = new Map<number, { first_name?: string; last_name?: string; username?: string }>();
  if (telegramIds.length) {
    const { data, error } = await db.from('users').select('telegram_id, first_name, last_name, username').in('telegram_id', telegramIds);
    if (error) throw error;
    for (const user of data ?? []) usersById.set(Number(user.telegram_id), user);
  }
  const resultsById = new Map(results.map((row) => [String(row.id), row]));
  return rows.map((event) => {
    const telegramId = Number(event.telegram_id);
    const user = usersById.get(telegramId);
    const result = event.quiz_result_id ? resultsById.get(String(event.quiz_result_id)) : undefined;
    return {
      telegramId,
      name: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Без имени',
      username: user?.username ? `@${user.username}` : 'не указан',
      goal: label(goalLabels, result?.goal),
      location: label(locationLabels, result?.location),
      experience: label(experienceLabels, result?.experience),
      program: label(programLabels, result?.recommended_program),
      source: result?.campaign ? `${result.source ?? 'organic'} / ${result.campaign}` : String(result?.source ?? 'organic'),
      createdAt: String(event.created_at ?? result?.completed_at ?? ''),
    };
  });
}

function section(title: string, values: Record<string, number>, mapper?: (key: string) => string) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  return `${title}\n${entries.length ? entries.map(([key, value]) => `• ${mapper ? mapper(key) : key}: ${value}`).join('\n') : '• пока нет данных'}`;
}
export function formatQuizAdminOverview(stats: Awaited<ReturnType<typeof getQuizAdminStats>>) {
  return [
    '📊 PAVEL FITNESS — АДМИН-ПАНЕЛЬ', '',
    `👥 Пользователи: ${stats.users}`,
    `🚀 Запуски теста: ${stats.starts}`,
    `✅ Уникальных участников: ${stats.uniqueTestUsers}`,
    `📝 Завершили тест: ${stats.testsCompleted} (${stats.conversion.startToTest})`,
    `📥 Получили программу: ${stats.programDownloads} (${stats.conversion.testToDownload})`,
    `🎯 Индивидуальных заявок: ${stats.uniqueOfferUsers} (${stats.conversion.testToOffer})`, '',
    '📈 КОНВЕРСИЯ',
    `Тест → программа: ${stats.conversion.testToDownload}`,
    `Программа → индивидуальная заявка: ${stats.conversion.downloadToOffer}`, '',
    section('🎯 Цели', stats.goals, (key) => label(goalLabels, key)), '',
    section('📍 Место тренировок', stats.locations, (key) => label(locationLabels, key)), '',
    section('📈 Опыт', stats.experiences, (key) => label(experienceLabels, key)),
  ].join('\n');
}
export function formatQuizAdminPrograms(stats: Awaited<ReturnType<typeof getQuizAdminStats>>) {
  return ['📄 ПРОГРАММЫ', '', section('Рекомендованные программы', stats.programs, (key) => label(programLabels, key))].join('\n');
}
export function formatQuizAdminSources(stats: Awaited<ReturnType<typeof getQuizAdminStats>>) {
  return ['🔗 ИСТОЧНИКИ И КАМПАНИИ', '', section('Откуда приходят пользователи', stats.sources)].join('\n');
}
export function formatQuizAdminLeads(leads: Awaited<ReturnType<typeof getRecentLeads>>) {
  if (!leads.length) return '🎯 ПОСЛЕДНИЕ ЗАЯВКИ\n\nПока заявок нет.';
  return ['🎯 ПОСЛЕДНИЕ ЗАЯВКИ', '', ...leads.map((lead, index) => [
    `#${index + 1} ${lead.name} ${lead.username}`,
    `🆔 ${lead.telegramId}`,
    `${lead.goal} • ${lead.location}`,
    `📈 ${lead.experience}`,
    `🏋️ ${lead.program}`,
    `🔗 ${lead.source}`,
    lead.createdAt ? `🕒 ${new Date(lead.createdAt).toLocaleString('ru-RU')}` : '',
  ].filter(Boolean).join('\n')).join('\n\n')].join('\n');
}

export const adminMenuText = 'Выбери раздел админ-панели 👇';
