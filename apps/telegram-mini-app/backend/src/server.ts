import 'dotenv/config';
import Fastify from 'fastify';
import { validateTelegramInitData } from './telegram-auth.js';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ ok: true, service: 'fitlife-telegram-backend' }));

app.post<{ Body: { initData?: string } }>('/api/auth/telegram', async (request, reply) => {
  try {
    const user = validateTelegramInitData(request.body?.initData ?? '', process.env.TELEGRAM_BOT_TOKEN ?? '');
    return { ok: true, user };
  } catch (error) {
    return reply.code(401).send({
      ok: false,
      error: error instanceof Error ? error.message : 'Unauthorized'
    });
  }
});

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

app.listen({ port, host }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
