import 'dotenv/config';

const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.FITLIFE_WEBAPP_URL;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
if (!webAppUrl) throw new Error('FITLIFE_WEBAPP_URL is required');

const api = `https://api.telegram.org/bot${token}`;
let offset = 0;

async function telegram(method: string, body: Record<string, unknown>) {
  const response = await fetch(`${api}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
  });
  const data = await response.json() as { ok: boolean; result?: unknown; description?: string };
  if (!data.ok) throw new Error(data.description ?? `Telegram API error: ${method}`);
  return data.result;
}

async function sendStart(chatId: number, firstName?: string) {
  await telegram('sendMessage', {
    chat_id: chatId,
    text: `Привет${firstName ? `, ${firstName}` : ''}! 👋\n\nДобро пожаловать в FitLife. Здесь твои тренировки, расписание и прогресс в одном месте.`,
    reply_markup: { inline_keyboard: [[{ text: '🚀 Открыть FitLife', web_app: { url: webAppUrl } }]] }
  });
}

async function sendHelp(chatId: number) {
  await telegram('sendMessage', {
    chat_id: chatId,
    text: 'FitLife помогает запускать тренировки, видеть расписание и отслеживать прогресс.\n\n/start — открыть FitLife\n/help — помощь\n/profile — открыть профиль',
    reply_markup: { inline_keyboard: [[{ text: 'Открыть приложение', web_app: { url: webAppUrl } }]] }
  });
}

async function poll() {
  while (true) {
    try {
      const updates = await telegram('getUpdates', { offset, timeout: 30, allowed_updates: ['message'] }) as Array<{ update_id: number; message?: { chat: { id: number }; text?: string; from?: { first_name?: string } } }>;
      for (const update of updates) {
        offset = update.update_id + 1;
        const message = update.message;
        if (!message?.text) continue;
        const command = message.text.split(' ')[0].split('@')[0];
        if (command === '/start') await sendStart(message.chat.id, message.from?.first_name);
        else if (command === '/help') await sendHelp(message.chat.id);
        else if (command === '/profile') await sendStart(message.chat.id, message.from?.first_name);
      }
    } catch (error) {
      console.error(error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

console.log('FitLife Telegram bot started');
await poll();
