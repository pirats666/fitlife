import { createQuizResult, event, getLatestQuizResult, getProgramPdfUrl, markProgramDownloaded, markProgramRequested, markTrainerClicked } from './quiz-store.js';
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
function programTitle(program: string) { return program === 'three_day_split' ? '3-DAY SPLIT — 3 тренировки в неделю' : program === 'full_body_home' ? 'FULL BODY HOME' : program === 'outdoor_full_body' ? 'OUTDOOR FULL BODY' : 'FULL BODY — старт для новичка'; }
function resultText(goal: QuizGoal, location: QuizLocation, experience: QuizExperience, program: string) { return `🎯 ТВОЯ СТАРТОВАЯ ТОЧКА\n\nЦель: ${goalLabels[goal]}\nМесто: ${locationLabels[location]}\nУровень: ${experienceLabels[experience]}\n\nТебе сейчас подойдёт:\n${programTitle(program)}\n\n${goalRecommendation(goal)}\n\nНе нужно начинать с огромного количества упражнений или тренироваться каждый день. Важнее выстроить регулярность и постепенно прогрессировать.\n\nЯ подготовил для тебя готовую программу.\n\n👇 Забирай её — а после я покажу следующий шаг.`; }

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
    if (!Number.isSafeInteger(adminId) || id !== adminId) { await send(id, '⛔ Доступ запрещён.'); return; }
    try { await send(id, formatQuizAdminStats(await getQuizAdminStats())); } catch (error) { console.error('Admin stats error:', error); await send(id, 'Не удалось получить статистику. Проверь настройки Supabase.'); }
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
    await event(id, 'OFFER_SHOWN', previous.id, previous.source ?? undefined, previous.campaign ?? undefined);
    await send(chatId, '🎯 ИНДИВИДУАЛЬНАЯ РАБОТА\n\nТы уже получил стартовую программу. Следующий уровень — программа, составленная именно под тебя.\n\nЧто можно разобрать:\n• твоя цель и текущий уровень;\n• место и условия тренировок;\n• удобный график;\n• упражнения и их последовательность;\n• постепенное изменение нагрузки.\n\nЕсли хочешь обсудить такой формат — напиши мне. Я посмотрю твою ситуацию и расскажу, как можно построить работу.', { inline_keyboard: [[{ text: '💬 ОБСУДИТЬ С ТРЕНЕРОМ', callback_data: 'quiz:trainer' }], [{ text: '📄 ОСТАВИТЬСЯ НА СТАРТОВОЙ ПРОГРАММЕ', callback_data: 'quiz:my_program' }]] });
    return;
  }

  if (cb.data === 'quiz:trainer') {
    let resultId = session?.resultId;
    let source = session?.source;
    let campaign = session?.campaign;
    if (!resultId) {
      const previous = await getLatestQuizResult(id);
      resultId = previous?.id;
      source = previous?.source ?? undefined;
      campaign = previous?.campaign ?? undefined;
    }
    if (resultId) { await markTrainerClicked(resultId); await event(id, 'TRAINER_CLICKED', resultId, source, campaign); }
    const username = process.env.TRAINER_TELEGRAM_USERNAME?.replace(/^@/, '');
    const previous = await getLatestQuizResult(id);
    const goalText = previous ? goalLabels[previous.goal as QuizGoal] : 'не указана';
    const locationText = previous ? locationLabels[previous.location as QuizLocation] : 'не указано';
    const experienceText = previous ? experienceLabels[previous.experience as QuizExperience] : 'не указан';
    if (username) {
      const prefilled = encodeURIComponent(`Привет! Я прошёл тест в боте.\nМоя цель: ${goalText}\nТренируюсь: ${locationText}\nОпыт: ${experienceText}\nХочу узнать про индивидуальную работу.`);
      await send(chatId, 'Отлично 💪\n\nЕсли хочешь индивидуальный подход, открой Telegram — сообщение уже будет подготовлено.\n\nЯ смогу посмотреть твою цель и условия тренировок и обсудить дальнейший план.', { inline_keyboard: [[{ text: '💬 НАПИСАТЬ ТРЕНЕРУ', url: `https://t.me/${username}?text=${prefilled}` }]] });
    }
    else await send(chatId, 'Отлично 💪\n\nНапиши свою цель, где тренируешься и что сейчас мешает прогрессу. Я посмотрю ситуацию и подскажу следующий шаг.');
  }
}
