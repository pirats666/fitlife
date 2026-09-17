import 'dotenv/config';
import { handleTelegramUpdate } from './telegram-quiz.js';

const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL ?? '';
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';

if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
if (!webhookUrl) throw new Error('TELEGRAM_WEBHOOK_URL is required');

const body: Record<string, unknown> = {
  url: webhookUrl,
  allowed_updates: ['message', 'callback_query'],
};
if (webhookSecret) body.secret_token = webhookSecret;

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});
if (!response.ok) throw new Error(`Telegram setWebhook failed: ${response.status}`);
console.log('Telegram webhook configured:', webhookUrl);

// Keep this entrypoint useful for local/manual update handling imports.
void handleTelegramUpdate;
