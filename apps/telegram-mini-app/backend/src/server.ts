import 'dotenv/config';
import Fastify from 'fastify';
import { validateTelegramInitData } from './telegram-auth.js';
import { getUser, updateUser, upsertUser } from './store.js';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ ok: true, service: 'fitlife-telegram-backend' }));

app.post<{ Body: { initData?: string } }>('/api/auth/telegram', async (request, reply) => {
  try {
    const telegramUser = validateTelegramInitData(request.body?.initData ?? '', process.env.TELEGRAM_BOT_TOKEN ?? '');
    const user = upsertUser(telegramUser);
    return { ok: true, user };
  } catch (error) {
    return reply.code(401).send({
      ok: false,
      error: error instanceof Error ? error.message : 'Unauthorized'
    });
  }
});

app.get<{ Params: { telegramId: string } }>('/api/users/:telegramId', async (request, reply) => {
  const telegramId = Number(request.params.telegramId);
  const user = getUser(telegramId);
  if (!Number.isSafeInteger(telegramId) || !user) {
    return reply.code(404).send({ ok: false, error: 'User not found' });
  }
  return { ok: true, user };
});

app.patch<{ Params: { telegramId: string }; Body: { goal?: 'health' | 'strength' | 'fitness'; onboardingCompleted?: boolean } }>('/api/users/:telegramId', async (request, reply) => {
  const telegramId = Number(request.params.telegramId);
  if (!Number.isSafeInteger(telegramId)) {
    return reply.code(400).send({ ok: false, error: 'Invalid telegramId' });
  }

  const user = updateUser(telegramId, request.body ?? {});
  if (!user) return reply.code(404).send({ ok: false, error: 'User not found' });
  return { ok: true, user };
});

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

app.listen({ port, host }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
