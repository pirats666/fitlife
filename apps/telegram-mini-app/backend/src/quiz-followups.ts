import { event, getDueFollowups, markFollowupSent } from './quiz-store.js';
import { goalLabels, locationLabels, experienceLabels, type QuizGoal, type QuizLocation, type QuizExperience } from './quiz.js';

const token = () => process.env.TELEGRAM_BOT_TOKEN ?? '';
const api = () => `https://api.telegram.org/bot${token()}`;


function segmentMessage(row: { goal: QuizGoal; location: QuizLocation; experience: QuizExperience }) {
  const goal = goalLabels[row.goal];
  const location = locationLabels[row.location];
  const experience = experienceLabels[row.experience];

  const goalTip: Record<QuizGoal, string> = {
    weight_loss: 'Сейчас твой главный фокус — регулярность и устойчивый режим.',
    muscle_gain: 'Сейчас твой главный фокус — техника, восстановление и постепенное увеличение нагрузки.',
    fitness: 'Сейчас твой главный фокус — развивать выносливость и общую физическую форму постепенно.',
    strength: 'Сейчас твой главный фокус — техника базовых движений и постепенное развитие силы.',
  };

  const locationTip: Record<QuizLocation, string> = {
    home: 'Тренироваться можно дома — главное, чтобы формат был удобным для тебя.',
    outdoor: 'Тренировки на спортплощадке отлично подходят для простого и доступного старта.',
    gym: 'В зале можно постепенно расширять упражнения и рабочие нагрузки по мере прогресса.',
  };

  const experienceTip: Record<QuizExperience, string> = {
    beginner: 'Если ты новичок, не нужно пытаться сделать максимум с первой тренировки.',
    returning: 'После перерыва лучше спокойно вернуть регулярность, а не сразу брать прежний объём.',
    regular: 'Раз ты уже тренируешься регулярно, следующий шаг — системно отслеживать прогресс.',
  };

  return `Твой профиль: ${goal} · ${location} · ${experience}.\n\n${goalTip[row.goal]}\n${locationTip[row.location]}\n${experienceTip[row.experience]}`;
}

async function send(chatId: number, text: string, replyMarkup?: unknown) {
  const response = await fetch(`${api()}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) }),
  });
  const json = await response.json() as { ok: boolean; description?: string };
  if (!response.ok || !json.ok) throw new Error(json.description ?? `Telegram API ${response.status}`);
}

export async function processQuizFollowups() {
  const due = await getDueFollowups();
  let sent = 0;

  for (const row of due) {
    const eligibleAt = row.followup_eligible_at ? new Date(row.followup_eligible_at).getTime() : 0;
    const ageHours = (Date.now() - eligibleAt) / 3_600_000;
    const step: 1 | 2 = !row.followup_1_sent_at && ageHours >= 24 ? 1 : !row.followup_2_sent_at && ageHours >= 72 ? 2 : 0 as 1 | 2;
    if (!step) continue;

    try {
      if (step === 1) {
        await send(Number(row.telegram_id), `👋 Как тебе первая тренировка по программе?\n\n${segmentMessage(row)}\n\nНе нужно делать всё идеально. Главное — начать и спокойно войти в регулярный ритм. Если ещё не начал, можешь сохранить программу и выбрать удобный день для старта.`);
        await markFollowupSent(String(row.id), 1);
        await event(Number(row.telegram_id), 'FOLLOWUP_1_SENT', String(row.id), row.source ?? undefined, row.campaign ?? undefined);
      } else {
        await send(Number(row.telegram_id), `🎯 Твой следующий шаг\n\n${segmentMessage(row)}\n\nЕсли хочешь перейти от готовой стартовой программы к плану под твою конкретную цель, уровень и условия тренировок — можешь оставить заявку на индивидуальную программу.`, {
          inline_keyboard: [[{ text: '🎯 ИНДИВИДУАЛЬНАЯ ПРОГРАММА', callback_data: 'quiz:offer' }]],
        });
        await markFollowupSent(String(row.id), 2);
        await event(Number(row.telegram_id), 'FOLLOWUP_2_SENT', String(row.id), row.source ?? undefined, row.campaign ?? undefined);
      }
      sent += 1;
    } catch (error) {
      console.error('Quiz follow-up error:', { resultId: row.id, step, error });
    }
  }

  return sent;
}
