import { createQuizResult, event, getLatestQuizResult, getProgramPdfUrl, markProgramDownloaded, markProgramRequested } from './quiz-store.js';
import { adminMenuText, formatQuizAdminLeads, formatQuizAdminOverview, formatQuizAdminPrograms, formatQuizAdminSources, getQuizAdminStats, getRecentLeads, getSourcePerformance } from './quiz-admin.js';
import { upsertUser } from './store.js';
import { goalLabels, locationLabels, experienceLabels, goalRecommendation, recommendProgram, type QuizExperience, type QuizGoal, type QuizLocation } from './quiz.js';
import { afterProgramKeyboard, experienceKeyboard, goalKeyboard, locationKeyboard, programKeyboard, startKeyboard } from './quiz-keyboards.js';
import { clearQuizSession, getQuizSession, startQuiz, updateQuizSession } from './quiz-session.js';

const token = () => process.env.TELEGRAM_BOT_TOKEN ?? '';
const api = () => `https://api.telegram.org/bot${token()}`;
type TelegramFrom = { id: number; username?: string; first_name?: string; last_name?: string; language_code?: string };
type Update = { message?: { chat: { id: number }; from?: TelegramFrom; text?: string }; callback_query?: { id: string; from: TelegramFrom; message?: { chat: { id: number }; message_id: number }; data?: string } };
type InlineKeyboard = { inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>> };

const adminKeyboard: InlineKeyboard = { inline_keyboard: [
  [{ text: '📊 ОБЩАЯ СТАТИСТИКА', callback_data: 'admin:overview' }],
  [{ text: '🎯 ПОСЛЕДНИЕ ЗАЯВКИ', callback_data: 'admin:leads' }],
  [{ text: '📄 ПРОГРАММЫ', callback_data: 'admin:programs' }],
  [{ text: '🔗 ИСТОЧНИКИ', callback_data: 'admin:sources' }],
  [{ text: '🔄 ОБНОВИТЬ', callback_data: 'admin:overview' }],
] };

function isAdmin(id: number) {
  const adminId = Number(process.env.ADMIN_TELEGRAM_ID);
  return Number.isSafeInteger(adminId) && id === adminId;
}

async function telegram(method: string, body: Record<string, unknown>) {
  if (!token()) throw new Error('TELEGRAM_BOT_TOKEN is required');
  const response = await fetch(`${api()}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await response.json() as { ok: boolean; result?: unknown; description?: string };
  if (!response.ok || !json.ok) throw new Error(json.description ?? `Telegram API ${response.status}`);
  return json.result;
}
async function send(chatId: number, text: string, replyMarkup?: InlineKeyboard) { return telegram('sendMessage', { chat_id: chatId, text, reply_markup: replyMarkup }); }
async function answerCallback(id: string) { try { await telegram('answerCallbackQuery', { callback_query_id: id }); } catch (error) { console.warn('Callback acknowledgement skipped:', error); } }
function parseStart(text: string) {
  const payload = text.split(/\s+/, 2)[1]?.trim() ?? '';
  if (!payload) return { source: undefined, campaign: undefined };

  // Telegram deep-link start payloads are limited to URL-safe characters,
  // so marketing links use: <source>__<campaign>.
  // Examples:
  //   ?start=reels
  //   ?start=reels__reels1
  //   ?start=stories__open_workout
  const [sourcePart, ...campaignParts] = payload.split('__');
  const source = sourcePart || undefined;
  const campaign = campaignParts.length ? campaignParts.join('__') || undefined : undefined;

  // Keep backward compatibility with the previous query-string format.
  if (payload.includes('=')) {
    const params = new URLSearchParams(payload);
    return {
      source: params.get('source') ?? undefined,
      campaign: params.get('campaign') ?? undefined,
    };
  }

  return { source, campaign };
}
function programTitle(program: string) { return program === 'three_day_split' ? '3-DAY SPLIT — 3 тренировки в неделю' : program === 'full_body_home' ? 'FULL BODY HOME' : program === 'outdoor_full_body' ? 'OUTDOOR FULL BODY' : 'FULL BODY — старт для новичка'; }
function resultText(goal: QuizGoal, location: QuizLocation, experience: QuizExperience, program: string) { return `🎯 ТВОЯ СТАРТОВАЯ ТОЧКА\n\nЦель: ${goalLabels[goal]}\nМесто: ${locationLabels[location]}\nУровень: ${experienceLabels[experience]}\n\nТебе сейчас подойдёт:\n${programTitle(program)}\n\n${goalRecommendation(goal)}\n\nНе нужно начинать с огромного количества упражнений или тренироваться каждый день. Важнее выстроить регулярность и постепенно прогрессировать.\n\nЯ подготовил для тебя готовую программу.\n\n👇 Забирай её — а после я покажу следующий шаг.`; }

async function ensureUser(user: TelegramFrom | undefined, fallbackId: number) {
  if (!user) return;
  await upsertUser({ id: user.id, first_name: user.first_name ?? 'Telegram user', ...(user.last_name ? { last_name: user.last_name } : {}), ...(user.username ? { username: user.username } : {}), ...(user.language_code ? { language_code: user.language_code } : {}) });
  if (user.id !== fallbackId) throw new Error('Telegram user/chat mismatch');
}

export async function handleTelegramUpdate(update: Update) {
  const message = update.message;
  if (message?.text?.startsWith('/admin') || message?.text?.startsWith('/stats')) {
    const id = message.chat.id;
    await ensureUser(message.from, id);
    if (!isAdmin(id)) { await send(id, '⛔ Доступ запрещён.'); return; }
    await send(id, adminMenuText, adminKeyboard);
    return;
  }
  if (message?.text?.startsWith('/start')) {
    const id = message.chat.id;
    await ensureUser(message.from, id);
    const { source, campaign } = parseStart(message.text);
    const previous = await getLatestQuizResult(id);
    if (previous) {
      const sourceToKeep = source ?? previous.source ?? undefined;
      const campaignToKeep = campaign ?? previous.campaign ?? undefined;
      clearQuizSession(id);
      startQuiz(id, sourceToKeep, campaignToKeep);
      await event(id, 'START', previous.id, sourceToKeep, campaignToKeep);
      await send(id, `Ты уже проходил тест 👋\n\nТвоя предыдущая рекомендация:\n${programTitle(previous.recommended_program)}\n\nХочешь пройти тест заново?`, { inline_keyboard: [[{ text: '🔄 ПРОЙТИ ЗАНОВО', callback_data: 'quiz:restart' }], [{ text: '📄 МОЯ ПРОГРАММА', callback_data: 'quiz:my_program' }]] });
      return;
    }
    startQuiz(id, source, campaign);
    await event(id, 'START', undefined, source, campaign);
    await send(id, 'Привет! 👋 Я помогу тебе определить, с чего лучше начать тренировки.\n\nВсего 3 вопроса — цель, место тренировок и твой опыт.\nВ конце ты получишь направление тренировок и подходящую стартовую программу.\n\nЗаймёт около минуты.\n👇 Давай начнём.', startKeyboard);
    return;
  }
  const cb = update.callback_query;
  if (!cb?.data || !cb.message) return;
  const id = cb.from.id;
  const chatId = cb.message.chat.id;
  await ensureUser(cb.from, chatId);
  await answerCallback(cb.id);

  if (cb.data.startsWith('admin:')) {
    if (!isAdmin(id)) { await send(chatId, '⛔ Доступ запрещён.'); return; }
    try {
      if (cb.data === 'admin:overview') await send(chatId, formatQuizAdminOverview(await getQuizAdminStats()), adminKeyboard);
      else if (cb.data === 'admin:leads') await send(chatId, formatQuizAdminLeads(await getRecentLeads()), adminKeyboard);
      else if (cb.data === 'admin:programs') await send(chatId, formatQuizAdminPrograms(await getQuizAdminStats()), adminKeyboard);
      else if (cb.data === 'admin:sources') { const stats = await getQuizAdminStats(); const sourcePerformance = await getSourcePerformance(); await send(chatId, formatQuizAdminSources(stats, sourcePerformance), adminKeyboard); }
      else await send(chatId, adminMenuText, adminKeyboard);
    } catch (error) {
      console.error('Admin panel error:', error);
      await send(chatId, 'Не удалось загрузить раздел админ-панели. Проверь подключение к Supabase.', adminKeyboard);
    }
    return;
  }

  let session = getQuizSession(id);

  if (cb.data === 'quiz:start' || cb.data === 'quiz:restart') {
    const next = session ?? startQuiz(id);
    clearQuizSession(id);
    startQuiz(id, next.source, next.campaign);
    await event(id, 'TEST_STARTED', undefined, next.source, next.campaign);
    await send(chatId, 'Вопрос 1 из 3\n\nКакая у тебя главная цель сейчас?', goalKeyboard);
    return;
  }

  if (cb.data.startsWith('quiz:goal:')) {
    const goal = cb.data.split(':')[2] as QuizGoal;
    if (!Object.prototype.hasOwnProperty.call(goalLabels, goal)) { await send(chatId, 'Выбери один из вариантов ниже 👇', goalKeyboard); return; }
    session = updateQuizSession(id, { goal });
    await event(id, 'QUESTION_1', undefined, session.source, session.campaign);
    await send(chatId, 'Вопрос 2 из 3\n\nГде ты планируешь тренироваться?', locationKeyboard);
    return;
  }

  if (cb.data.startsWith('quiz:location:')) {
    const location = cb.data.split(':')[2] as QuizLocation;
    if (!Object.prototype.hasOwnProperty.call(locationLabels, location)) { await send(chatId, 'Выбери один из вариантов ниже 👇', locationKeyboard); return; }
    session = updateQuizSession(id, { location });
    await event(id, 'QUESTION_2', undefined, session.source, session.campaign);
    await send(chatId, 'Вопрос 3 из 3\n\nКакой у тебя сейчас опыт тренировок?', experienceKeyboard);
    return;
  }

  if (cb.data.startsWith('quiz:experience:')) {
    const experience = cb.data.split(':')[2] as QuizExperience;
    if (!Object.prototype.hasOwnProperty.call(experienceLabels, experience)) { await send(chatId, 'Выбери один из вариантов ниже 👇', experienceKeyboard); return; }
    session = updateQuizSession(id, { experience });
    const goal = session.goal;
    const location = session.location;
    const selectedExperience = session.experience;
    if (!goal || !location || !selectedExperience) { await send(chatId, 'Похоже, тест начался заново. Давай пройдём его ещё раз 👇', startKeyboard); return; }
    const program = recommendProgram(location, selectedExperience);
    session = updateQuizSession(id, { program });
    const resultId = await createQuizResult(id, goal, location, selectedExperience, program, session.source, session.campaign);
    session = updateQuizSession(id, { resultId });
    await event(id, 'QUESTION_3', resultId, session.source, session.campaign);
    await event(id, 'TEST_COMPLETED', resultId, session.source, session.campaign);
    await event(id, 'RESULT_SHOWN', resultId, session.source, session.campaign);
    await send(chatId, resultText(goal, location, selectedExperience, program), programKeyboard);
    return;
  }

  if (cb.data === 'quiz:my_program') {
    const previous = await getLatestQuizResult(id);
    if (!previous) { await send(chatId, 'Пока нет сохранённой программы. Пройди тест 👇', startKeyboard); return; }
    const pdfUrl = await getProgramPdfUrl(previous.recommended_program as Parameters<typeof getProgramPdfUrl>[0]);
    if (!pdfUrl) { await send(chatId, 'Кажется, программа временно недоступна. Попробуй ещё раз через минуту.'); return; }
    try {
      await telegram('sendDocument', { chat_id: chatId, document: pdfUrl, caption: `Готово 💪\nВот твоя сохранённая программа: ${programTitle(previous.recommended_program)}.` });
      await markProgramDownloaded(previous.id);
      await event(id, 'PROGRAM_DOWNLOADED', previous.id, previous.source ?? undefined, previous.campaign ?? undefined);
    } catch (error) { console.error('My program delivery error:', error); await send(chatId, 'Кажется, программа временно недоступна. Попробуй ещё раз через минуту.'); }
    return;
  }

  if (cb.data === 'quiz:program') {
    let resultId = session?.resultId;
    let program = session?.program;
    let source = session?.source;
    let campaign = session?.campaign;
    if (!resultId || !program) {
      const previous = await getLatestQuizResult(id);
      if (!previous) { await send(chatId, 'Пока нет сохранённой программы. Пройди тест 👇', startKeyboard); return; }
      resultId = previous.id;
      program = previous.recommended_program as Parameters<typeof getProgramPdfUrl>[0];
      source = previous.source ?? undefined;
      campaign = previous.campaign ?? undefined;
    }
    if (!resultId || !program) { await send(chatId, 'Пока нет сохранённой программы. Пройди тест 👇', startKeyboard); return; }
    const pdfUrl = await getProgramPdfUrl(program);
    if (!pdfUrl) { await send(chatId, 'Кажется, программа временно недоступна. Попробуй ещё раз через минуту.'); return; }
    await markProgramRequested(resultId); await event(id, 'PROGRAM_REQUESTED', resultId, source, campaign);
    try { await telegram('sendDocument', { chat_id: chatId, document: pdfUrl, caption: 'Готово 💪\nВот твою стартовую программу. Используй её как основу и постепенно прогрессируй по нагрузке.' }); await markProgramDownloaded(resultId); await event(id, 'PROGRAM_DOWNLOADED', resultId, source, campaign); await send(chatId, `🔥 Программа у тебя. Теперь можно перейти от общего плана к работе под твою ситуацию.\n\nЕсли хочешь индивидуальный подход, я помогу разобрать твою цель, текущий уровень и условия тренировок и подобрать дальнейший план.\n\nВыбери следующий шаг 👇`, afterProgramKeyboard); }
    catch (error) { console.error('Program delivery error:', error); await send(chatId, 'Кажется, программа временно недоступна. Попробуй ещё раз через минуту.'); }
    return;
  }

  if (cb.data === 'quiz:offer') {
    const previous = await getLatestQuizResult(id);
    if (!previous) { await send(chatId, 'Сначала пройди короткий тест 👇', startKeyboard); return; }

    try {
      await event(id, 'OFFER_SHOWN', previous.id, previous.source ?? undefined, previous.campaign ?? undefined);
    } catch (error) {
      console.error('Offer tracking error:', error);
    }

    const trainerId = Number(process.env.ADMIN_TELEGRAM_ID);
    if (!Number.isSafeInteger(trainerId) || trainerId <= 0) {
      console.error('ADMIN_TELEGRAM_ID is not configured');
      await send(chatId, '🎯 Заявка принята!\n\nРезультат сохранён. Тренер получит заявку после настройки уведомлений.');
      return;
    }

    const fullName = [cb.from.first_name, cb.from.last_name].filter(Boolean).join(' ') || 'не указано';
    const username = cb.from.username ? `@${cb.from.username}` : 'не указан';
    const leadMessage = `🎯 НОВАЯ ЗАЯВКА НА ИНДИВИДУАЛЬНУЮ ПРОГРАММУ

👤 Имя: ${fullName}
📱 Telegram: ${username}
🆔 Telegram ID: ${id}

🎯 Цель: ${goalLabels[previous.goal as QuizGoal]}
📍 Место: ${locationLabels[previous.location as QuizLocation]}
📈 Опыт: ${experienceLabels[previous.experience as QuizExperience]}
🏋️ Рекомендованная программа: ${programTitle(previous.recommended_program)}`;

    try {
      await send(trainerId, leadMessage);
      await send(chatId, '🎯 Заявка принята!\n\nЯ передал твой результат тренеру. Он сможет посмотреть данные теста и связаться с тобой дальше.');
    } catch (error) {
      console.error('Trainer notification error:', error);
      await send(chatId, '🎯 Заявка принята!\n\nРезультат сохранён, но уведомление тренеру пока не доставлено. Попробуй ещё раз чуть позже.');
    }
    return;
  }
}
