import 'dotenv/config';
import path from 'node:path';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { validateTelegramInitData } from './telegram-auth.js';
import { getUser, updateUser, upsertUser, completeWorkout, getWorkoutHistory, getTrainerClients, assignClient, getClientTrainer, isTrainer, isClientAssigned } from './store.js';
import { getWorkout, workouts } from './workouts.js';
import { getWeeklySchedule } from './schedule.js';
import { getClientSchedule, setClientSchedule } from './trainer.js';
import { handleTelegramUpdate } from './telegram-quiz.js';

const app = Fastify({ logger: true });
const configuredOrigin = process.env.WEBAPP_ORIGIN?.trim();
await app.register(cors, { origin: configuredOrigin || true });
const webappRoot = process.env.NODE_ENV === 'production' ? path.resolve(process.cwd(), 'webapp') : path.resolve(process.cwd(), '../webapp');
await app.register(fastifyStatic, { root: webappRoot, prefix: '/' });

async function authenticatedUser(initData: string | undefined) { if (!initData) return undefined; try { return await upsertUser(validateTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN ?? '')); } catch { return undefined; } }
function headerInitData(request: { headers: Record<string, string | string[] | undefined> }) { const value = request.headers['x-telegram-init-data']; return Array.isArray(value) ? value[0] : value; }
async function trainerAuthorized(request: { headers: Record<string, string | string[] | undefined> }, trainerId: number) { const authUser = await authenticatedUser(headerInitData(request)); return authUser?.id === trainerId && await isTrainer(trainerId); }

app.get('/health', async () => ({ ok: true, service: 'fitlife-telegram-backend', storage: 'supabase' }));
app.post('/api/telegram/webhook', async (request, reply) => {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const receivedSecret = request.headers['x-telegram-bot-api-secret-token'];
  const secret = Array.isArray(receivedSecret) ? receivedSecret[0] : receivedSecret;
  if (expectedSecret && secret !== expectedSecret) return reply.code(401).send({ ok: false, error: 'Unauthorized' });
  try { await handleTelegramUpdate(request.body as Record<string, unknown>); return { ok: true }; } catch (error) { request.log.error(error); return reply.code(500).send({ ok: false, error: 'Telegram update failed' }); }
});
app.post('/api/auth/telegram', async (request: any, reply) => { try { return { ok: true, user: await upsertUser(validateTelegramInitData(request.body?.initData ?? '', process.env.TELEGRAM_BOT_TOKEN ?? '')) }; } catch (error) { return reply.code(401).send({ ok: false, error: error instanceof Error ? error.message : 'Unauthorized' }); } });
app.get('/api/workouts', async () => ({ ok: true, workouts }));
app.get('/api/workouts/:workoutId', async (request: any, reply) => { const workout = getWorkout(request.params.workoutId); if (!workout) return reply.code(404).send({ ok: false, error: 'Workout not found' }); return { ok: true, workout }; });
app.get('/api/users/:telegramId', async (request: any, reply) => { const telegramId = Number(request.params.telegramId); const authUser = await authenticatedUser(headerInitData(request)); if (!Number.isSafeInteger(telegramId) || !authUser || authUser.id !== telegramId) return reply.code(403).send({ ok: false, error: 'Forbidden' }); const user = await getUser(telegramId); if (!user) return reply.code(404).send({ ok: false, error: 'User not found' }); return { ok: true, user }; });
app.patch('/api/users/:telegramId', async (request: any, reply) => { const telegramId = Number(request.params.telegramId); const authUser = await authenticatedUser(headerInitData(request)); if (!Number.isSafeInteger(telegramId) || !authUser || authUser.id !== telegramId) return reply.code(403).send({ ok: false, error: 'Forbidden' }); const user = await updateUser(telegramId, request.body ?? {}); if (!user) return reply.code(404).send({ ok: false, error: 'User not found' }); return { ok: true, user }; });
app.post('/api/users/:telegramId/workouts/:workoutId/complete', async (request: any, reply) => { const telegramId = Number(request.params.telegramId); const authUser = await authenticatedUser(headerInitData(request)); if (!Number.isSafeInteger(telegramId) || !authUser || authUser.id !== telegramId) return reply.code(403).send({ ok: false, error: 'Forbidden' }); if (!getWorkout(request.params.workoutId)) return reply.code(404).send({ ok: false, error: 'Workout not found' }); const history = await completeWorkout(telegramId, request.params.workoutId); if (!history) return reply.code(404).send({ ok: false, error: 'User not found' }); return { ok: true, history }; });
