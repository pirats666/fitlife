import { createQuizResult, event, getProgramPdfUrl, markProgramDownloaded, markProgramRequested, markTrainerClicked } from './quiz-store.js';
import { getQuizAdminStats, formatQuizAdminStats } from './quiz-admin.js';
import { upsertUser } from './store.js';
import { goalLabels, locationLabels, experienceLabels, goalRecommendation, recommendProgram, type QuizExperience, type QuizGoal, type QuizLocation } from './quiz.js';
import { afterProgramKeyboard, experienceKeyboard, goalKeyboard, locationKeyboard, programKeyboard, startKeyboard } from './quiz-keyboards.js';
import { clearQuizSession, getQuizSession, startQuiz, updateQuizSession } from './quiz-session.js';

const token = () => process.env.TELEGRAM_BOT_TOKEN ?? '';
const api = () => `https://api.telegram.org/bot${token()}`;
type TelegramFrom = { id: number; username?: string; first_name?: string; last_name?: string; language_code?: string };
type Update = { message?: { chat: { id: number }; from?: TelegramFrom; text?: string }; callback_query?: { id: string; from: TelegramFrom; message?: { chat: { id: number }; message_id: number }; data?: string } };
type InlineKeyboard = { inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>> };

async function telegram(method: string, body: Record<string, unknown>) {
  if (!token()) throw new Error('TELEGRAM_BOT_TOKEN is required');
  const response = await fetch(`${api()}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await response.json() as { ok: boolean; result?: unknown; description?: string };
  if (!response.ok || !json.ok) throw new Error(json.description ?? `Telegram API ${response.status}`);
  return json.result;
}
async function send(chatId: number, text: string, replyMarkup?: InlineKeyboard) { return telegram('sendMessage', { chat_id: chatId, text, reply_markup: replyMarkup }); }
async function answerCallback(id: string) { await telegram('answerCallbackQuery', { callback_query_id: id }); }
function parseStart(text: string) { const payload = text.split(/\s+/, 2)[1] ?? ''; const params = new URLSearchParams(payload); return { source: params.get('source') ?? (payload && !payload.includes('=') ? payload : undefined), campaign: params.get('campaign') ?? undefined }; }
function resultText(goal: QuizGoal, location: QuizLocation, experience: QuizExperience, program: string) { const title = program === 'three_day_split' ? '3-DAY SPLIT — 3 тренировки в неделю' : program === 'full_body_home' ? 'FULL BODY HOME' : program === 'outdoor_full_body' ? 'OUTDOOR FULL BODY' : 'FULL BODY — старт для новичка'; return `🎯 ТВОЯ СТАРТОВАЯ ТОЧКА\n\nЦель: ${goalLabels[goal]}\nМесто: ${locationLabels[location]}\nУровень: ${experienceLabels[experience]}\n\nТебе сейчас подойдёт:\n${title}\n\n${goalRecommendation(goal)}\n\nНе нужно начинать с огромного количества упражнений или тренироваться каждый день. Важнее выстроить регулярность и постепенно прогрессировать.\n\nЯ подготовил для тебя готовую программу.`; }

async function ensureUser(user: TelegramFrom | undefined, fallbackId: number) {
  if (!user) return;
  await upsertUser({ id: user.id, first_name: user.first_name ?? 'Telegram user', ...(user.last_name ? { last_name: user.last_name } : {}), ...(user.username ? { username: user.username } : {}), ...(user.language_code ? { language_code: user.language_code } : {}) });
  if (user.id !== fallbackId) throw new Error('Telegram user/chat mismatch');
}

export async function handleTelegramUpdate(update: Update) {
  const message = update.message;
  if (message?.text?.startsWith('/admin')) {
    const id = message.chat.id;
    await ensureUser(message.from, id);
    const adminId = Number(process.env.ADMIN_TELEGRAM_ID);
    if (!Number.isSafeInteger(adminId) || id !== adminId) {
      await send(id, '⛔ Доступ запрещён.');
      return;
    }
    try {
      const stats = await getQuizAdminStats();
      await send(id, formatQuizAdminStats(stats));
    } catch (error) {
      console.error('Admin stats error:', error);
      await send(id, 'Не удалось получить статистику. Проверь настройки Supabase.');
    }
    return;
  }
  if (message?.text?.startsWith('/start')) {
    const id = message.chat.id;
    await ensureUser(message.from, id);
    const { source, campaign } = parseStart(message.text);
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
  const session = getQuizSession(id);
  if (cb.data === 'quiz:start' || cb.data === 'quiz:restart') {
    const next = session ?? startQuiz(id);
    clearQuizSession(id);
    startQuiz(id, next.source, next.campaign);
    await event(id, 'TEST_STARTED', undefined, next.source, next.campaign);
    await send(chatId, 'Вопрос 1 из 3\n\nКакая у тебя главная цель сейчас?', goalKeyboard);
    return;
  }
  if (!session) { await send(chatId, 'Эта кнопка больше не актуальна. Давай начнём заново 👇', startKeyboard); return; }
  if (cb.data.startsWith('quiz:goal:')) {
    const goal = cb.data.slice('quiz:goal:'.length) as QuizGoal;
    if (!(goal in goalLabels)) return;
    updateQuizSession(id, { goal });
    await event(id, 'QUESTION_1', session.resultId, session.source, session.campaign);
    await send(chatId, 'Отлично 👍\n\nВопрос 2 из 3\n\nГде ты планируешь тренироваться?', locationKeyboard);
    return;
  }
  if (cb.data.startsWith('quiz:location:')) {
    const location = cb.data.slice('quiz:location:'.length) as QuizLocation;
    if (!(location in locationLabels)) return;
    updateQuizSession(id, { location });
    await event(id, 'QUESTION_2', session.resultId, session.source, session.campaign);
    await send(chatId, 'Понял 👍\n\nВопрос 3 из 3\n\nКакой у тебя сейчас опыт тренировок?', experienceKeyboard);
    return;
  }
  if (cb.data.startsWith('quiz:experience:')) {
    const experience = cb.data.slice('quiz:experience:'.length) as QuizExperience;
    if (!(experience in experienceLabels) || !session.goal || !session.location) return;
    const program = recommendProgram(session.location, experience);
    const resultId = await createQuizResult(id, session.goal, session.location, experience, program, session.source, session.campaign);
    updateQuizSession(id, { experience, program, resultId });
    await event(id, 'QUESTION_3', resultId, session.source, session.campaign);
    await event(id, 'TEST_COMPLETED', resultId, session.source, session.campaign);
    await event(id, 'RESULT_SHOWN', resultId, session.source, session.campaign);
    await send(chatId, resultText(session.goal, session.location, experience, program), programKeyboard);
    return;
  }
  if (cb.data === 'quiz:program') {
    if (!session.resultId || !session.program) return;
    const pdfUrl = await getProgramPdfUrl(session.program);
    if (!pdfUrl) { await send(chatId, 'Кажется, программа временно недоступна. Попробуй ещё раз через минуту.'); return; }
    await markProgramRequested(session.resultId);
    await event(id, 'PROGRAM_REQUESTED', session.resultId, session.source, session.campaign);
    try {
      await telegram('sendDocument', { chat_id: chatId, document: pdfUrl, caption: 'Готово 💪\nВот твоя стартовая программа. Используй её как основу и постепенно прогрессируй по нагрузке.' });
      await markProgramDownloaded(session.resultId);
      await event(id, 'PROGRAM_DOWNLOADED', session.resultId, session.source, session.campaign);
      await send(chatId, 'Хочешь следующий шаг? 👇\n\nЯ могу помочь подобрать программу уже под твою конкретную ситуацию, а не просто дать общий план.', afterProgramKeyboard);
    } catch {
      await send(chatId, 'Кажется, программа временно недоступна. Попробуй ещё раз через минуту.');
    }
    return;
  }
  if (cb.data === 'quiz:trainer') {
    if (session.resultId) { await markTrainerClicked(session.resultId); await event(id, 'TRAINER_CLICKED', session.resultId, session.source, session.campaign); }
    const username = process.env.TRAINER_TELEGRAM_USERNAME?.replace(/^@/, '');
    if (username) await send(chatId, 'Отлично 💪\n\nНапиши мне пару слов:\n1. Какая у тебя цель?\n2. Где тренируешься?\n3. Что сейчас больше всего мешает прогрессу?\n\nЯ посмотрю твою ситуацию и подскажу, с чего начать.', { inline_keyboard: [[{ text: '💬 ОТКРЫТЬ TELEGRAM', url: `https://t.me/${username}` }]] });
    else await send(chatId, 'Отлично 💪\n\nНапиши следующим сообщением свою цель, место тренировок и что сейчас мешает прогрессу.');
    return;
  }
}
