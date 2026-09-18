import 'dotenv/config';
import Fastify from 'fastify';
import { registerTelegramNewBotRoute } from './telegram-new-bot-route.js';

const app = Fastify({ logger: true });
await registerTelegramNewBotRoute(app);
app.get('/health', async () => ({ ok: true, service: 'pavel-fitness-support-bot' }));

const port = Number(process.env.PORT ?? 10000);
const host = process.env.HOST ?? '0.0.0.0';

async function configureWebhook() {
  const token = process.env.NEW_TELEGRAM_BOT_TOKEN?.trim();
  const baseUrl = process.env.NEW_TELEGRAM_WEBHOOK_URL?.trim() || process.env.RENDER_EXTERNAL_URL?.trim();
  if (!token || !baseUrl) {
    app.log.warn('Telegram webhook was not configured: bot token or webhook URL is missing');
    return;
  }
  const webhookUrl = baseUrl.replace(/\/$/, '') + '/api/telegram/new-bot/webhook';
  const body: Record<string, string> = { url: webhookUrl };
  const secret = process.env.NEW_TELEGRAM_WEBHOOK_SECRET?.trim();
  if (secret) body.secret_token = secret;
  const response = await fetch('https://api.telegram.org/bot' + token + '/setWebhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json() as { ok?: boolean; description?: string };
  if (!response.ok || !result.ok) throw new Error(result.description ?? 'Telegram setWebhook failed');
  app.log.info({ webhookUrl }, 'New Telegram bot webhook configured');
}

await app.listen({ port, host });
await configureWebhook();
