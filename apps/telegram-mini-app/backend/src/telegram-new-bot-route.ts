import type { FastifyInstance } from 'fastify';
import { handleNewTelegramUpdate } from './telegram-new-bot.js';

export async function registerTelegramNewBotRoute(app: FastifyInstance){
  app.post('/api/telegram/new-bot/webhook', async (request, reply) => {
    const secret=process.env.NEW_TELEGRAM_WEBHOOK_SECRET?.trim();
    const received=request.headers['x-telegram-bot-api-secret-token'];
    if(secret && received !== secret) return reply.code(401).send({ok:false});
    try { await handleNewTelegramUpdate(request.body as Record<string,unknown>); return {ok:true}; }
    catch(error){ request.log.error(error); return reply.code(500).send({ok:false,error:'New Telegram bot update failed'}); }
  });
}
