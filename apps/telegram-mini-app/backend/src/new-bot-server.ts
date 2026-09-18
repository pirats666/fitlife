import 'dotenv/config';
import Fastify from 'fastify';
import { registerTelegramNewBotRoute } from './telegram-new-bot-route.js';
import { initProject2Db } from './project2-db.js';
import { registerProject2Crm } from './project2-crm.js';

const app = Fastify({ logger: true });
await registerTelegramNewBotRoute(app);
await registerProject2Crm(app);

app.get('/', async () => ({
  ok: true,
  service: 'pavel-fitness-support-bot',
  webhook: 'telegram',
}));

app.get('/admin', async () => ({ ok: true, service: 'pavel-fitness-support-crm', panel: '/project2-admin.html' }));

app.get('/health', async () => ({
  ok: true,
  service: 'pavel-fitness-support-bot',
}));

const port = Number(process.env.PORT ?? 10000);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await initProject2Db();
  app.log.info('Project 2 PostgreSQL storage initialized');
} catch (error) {
  app.log.error({ error }, 'Project 2 PostgreSQL initialization failed');
}

async function configureWebhook() {
  const token = process.env.NEW_TELEGRAM_BOT_TOKEN?.trim();
  const baseUrl =
    process.env.NEW_TELEGRAM_WEBHOOK_URL?.trim() ||
    process.env.RENDER_EXTERNAL_URL?.trim() ||
    'https://pavel-fitness-support-bot.onrender.com';

  app.log.info(
    {
      tokenConfigured: Boolean(token),
      webhookBaseConfigured: Boolean(
        process.env.NEW_TELEGRAM_WEBHOOK_URL?.trim() ||
        process.env.RENDER_EXTERNAL_URL?.trim(),
      ),
      secretConfigured: Boolean(process.env.NEW_TELEGRAM_WEBHOOK_SECRET?.trim()),
    },
    'New Telegram bot environment check',
  );

  if (!token) {
    app.log.error(
      'New Telegram bot cannot start webhook configuration: NEW_TELEGRAM_BOT_TOKEN is missing in Render Environment Variables',
    );
    return;
  }

  const webhookUrl =
    baseUrl.replace(/\/$/, '') + '/api/telegram/new-bot/webhook';

  const body: Record<string, string> = { url: webhookUrl };
  const secret = process.env.NEW_TELEGRAM_WEBHOOK_SECRET?.trim();
  if (secret) body.secret_token = secret;

  try {
    const response = await fetch(
      'https://api.telegram.org/bot' + token + '/setWebhook',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    const result = (await response.json()) as {
      ok?: boolean;
      description?: string;
    };

    if (!response.ok || !result.ok) {
      throw new Error(result.description ?? 'Telegram setWebhook failed');
    }

    app.log.info({ webhookUrl }, 'New Telegram bot webhook configured');
  } catch (error) {
    app.log.error({ error }, 'Failed to configure New Telegram bot webhook');
  }
}

await app.listen({ port, host });
await configureWebhook();
