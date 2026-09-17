import type { FastifyInstance } from 'fastify';
import { handleTelegramUpdate } from './telegram-quiz.js';

export async function registerTelegramQuizRoute(app: FastifyInstance) {
  app.post('/api/telegram/webhook', async (request, reply) => {
    try {
      await handleTelegramUpdate(request.body as Record<string, unknown>);
      return { ok: true };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ ok: false, error: 'Telegram update failed' });
    }
  });
}
