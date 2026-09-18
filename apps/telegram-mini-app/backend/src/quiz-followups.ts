import { event, getDueFollowups, markFollowupSent } from './quiz-store.js';

const token = () => process.env.TELEGRAM_BOT_TOKEN ?? '';
const api = () => `https://api.telegram.org/bot${token()}`;

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
        await send(Number(row.telegram_id), '👋 Как тебе первая тренировка по программе?\n\nНе нужно делать всё идеально. Главное — начать и спокойно войти в регулярный ритм. Если ещё не начал, можешь сохранить программу и выбрать удобный день для старта.');
        await markFollowupSent(String(row.id), 1);
        await event(Number(row.telegram_id), 'FOLLOWUP_1_SENT', String(row.id), row.source ?? undefined, row.campaign ?? undefined);
      } else {
        await send(Number(row.telegram_id), '🎯 Если хочешь перейти от готовой стартовой программы к плану под твою конкретную цель, уровень и условия тренировок — можешь оставить заявку на индивидуальную программу.', {
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
