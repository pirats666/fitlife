import 'dotenv/config';
import Fastify from 'fastify';
import { validateTelegramInitData } from './telegram-auth.js';
import { getUser, updateUser, upsertUser, completeWorkout, getWorkoutHistory, getTrainerClients, assignClient, getClientTrainer, isTrainer } from './store.js';
import { getWorkout, workouts } from './workouts.js';
import { getWeeklySchedule } from './schedule.js';

const app = Fastify({ logger: true });

function authenticatedUser(initData: string | undefined) {
  if (!initData) return undefined;
  try { return upsertUser(validateTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN ?? '')); }
  catch { return undefined; }
}

function headerInitData(request: { headers: Record<string, string | string[] | undefined> }) {
  const value = request.headers['x-telegram-init-data'];
  return Array.isArray(value) ? value[0] : value;
}

app.get('/health', async () => ({ ok: true, service: 'fitlife-telegram-backend' }));

app.post<{ Body: { initData?: string } }>('/api/auth/telegram', async (request, reply) => {
  try {
    const telegramUser = validateTelegramInitData(request.body?.initData ?? '', process.env.TELEGRAM_BOT_TOKEN ?? '');
    return { ok: true, user: upsertUser(telegramUser) };
  } catch (error) {
    return reply.code(401).send({ ok: false, error: error instanceof Error ? error.message : 'Unauthorized' });
  }
});

app.get('/api/workouts', async () => ({ ok: true, workouts }));
app.get<{ Params: { workoutId: string } }>('/api/workouts/:workoutId', async (request, reply) => {
  const workout = getWorkout(request.params.workoutId);
  if (!workout) return reply.code(404).send({ ok: false, error: 'Workout not found' });
  return { ok: true, workout };
});

app.get<{ Params: { telegramId: string } }>('/api/users/:telegramId', async (request, reply) => {
  const telegramId = Number(request.params.telegramId);
  const authUser = authenticatedUser(headerInitData(request));
  if (!Number.isSafeInteger(telegramId) || !authUser || authUser.id !== telegramId) return reply.code(403).send({ ok: false, error: 'Forbidden' });
  const user = getUser(telegramId);
  if (!user) return reply.code(404).send({ ok: false, error: 'User not found' });
  return { ok: true, user };
});

app.patch<{ Params: { telegramId: string }; Body: { goal?: 'health' | 'strength' | 'fitness'; onboardingCompleted?: boolean } }>('/api/users/:telegramId', async (request, reply) => {
  const telegramId = Number(request.params.telegramId);
  const authUser = authenticatedUser(headerInitData(request));
  if (!Number.isSafeInteger(telegramId) || !authUser || authUser.id !== telegramId) return reply.code(403).send({ ok: false, error: 'Forbidden' });
  const user = updateUser(telegramId, request.body ?? {});
  if (!user) return reply.code(404).send({ ok: false, error: 'User not found' });
  return { ok: true, user };
});

app.post<{ Params: { telegramId: string; workoutId: string } }>('/api/users/:telegramId/workouts/:workoutId/complete', async (request, reply) => {
  const telegramId = Number(request.params.telegramId);
  const authUser = authenticatedUser(headerInitData(request));
  if (!Number.isSafeInteger(telegramId) || !authUser || authUser.id !== telegramId) return reply.code(403).send({ ok: false, error: 'Forbidden' });
  if (!getWorkout(request.params.workoutId)) return reply.code(404).send({ ok: false, error: 'Workout not found' });
  const history = completeWorkout(telegramId, request.params.workoutId);
  if (!history) return reply.code(404).send({ ok: false, error: 'User not found' });
  return { ok: true, history };
});

app.get<{ Params: { telegramId: string } }>('/api/users/:telegramId/workouts/history', async (request, reply) => {
  const telegramId = Number(request.params.telegramId);
  const authUser = authenticatedUser(headerInitData(request));
  if (!Number.isSafeInteger(telegramId) || !authUser || authUser.id !== telegramId) return reply.code(403).send({ ok: false, error: 'Forbidden' });
  const history = getWorkoutHistory(telegramId);
  if (!history) return reply.code(404).send({ ok: false, error: 'User not found' });
  return { ok: true, history };
});

app.get('/api/schedule', async () => ({ ok: true, schedule: getWeeklySchedule() }));

app.get<{ Params: { telegramId: string } }>('/api/users/:telegramId/progress', async (request, reply) => {
  const telegramId = Number(request.params.telegramId);
  const authUser = authenticatedUser(headerInitData(request));
  if (!Number.isSafeInteger(telegramId) || !authUser || authUser.id !== telegramId) return reply.code(403).send({ ok: false, error: 'Forbidden' });
  const history = getWorkoutHistory(telegramId);
  if (!history) return reply.code(404).send({ ok: false, error: 'User not found' });
  const weekStart = new Date(); const day = weekStart.getDay() || 7;
  weekStart.setDate(weekStart.getDate() - day + 1); weekStart.setHours(0, 0, 0, 0);
  return { ok: true, progress: { totalWorkouts: history.length, completedThisWeek: history.filter((item) => new Date(item.completedAt) >= weekStart).length, lastCompletedAt: history[0]?.completedAt ?? null } };
});

app.get<{ Querystring: { trainerId?: string } }>('/api/trainer/clients', async (request, reply) => {
  const trainerId = Number(request.query.trainerId);
  const authUser = authenticatedUser(headerInitData(request));
  if (!Number.isSafeInteger(trainerId) || !authUser || authUser.id !== trainerId || !isTrainer(trainerId)) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  return { ok: true, clients: getTrainerClients(trainerId) };
});

app.post<{ Body: { trainerId?: number; clientId?: number } }>('/api/trainer/clients/assign', async (request, reply) => {
  const trainerId = Number(request.body?.trainerId);
  const clientId = Number(request.body?.clientId);
  const authUser = authenticatedUser(headerInitData(request));
  if (!Number.isSafeInteger(trainerId) || !Number.isSafeInteger(clientId) || !authUser || authUser.id !== trainerId || !isTrainer(trainerId)) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  const assignment = assignClient(trainerId, clientId);
  if (!assignment) return reply.code(400).send({ ok: false, error: 'Client assignment failed' });
  return { ok: true, assignment };
});

app.get<{ Params: { clientId: string } }>('/api/trainer/clients/:clientId/progress', async (request, reply) => {
  const clientId = Number(request.params.clientId);
  const trainerId = Number(new URLSearchParams(request.headers['x-trainer-id']?.toString() ?? '').get('id'));
  const authUser = authenticatedUser(headerInitData(request));
  if (!Number.isSafeInteger(clientId) || !Number.isSafeInteger(trainerId) || !authUser || authUser.id !== trainerId || !isTrainer(trainerId)) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  const clients = getTrainerClients(trainerId);
  if (!clients.some((client) => client.id === clientId)) return reply.code(403).send({ ok: false, error: 'Client is not assigned to this trainer' });
  const history = getWorkoutHistory(clientId) ?? [];
  return { ok: true, client: getUser(clientId), history };
});

app.get<{ Params: { clientId: string } }>('/api/users/:clientId/trainer', async (request, reply) => {
  const clientId = Number(request.params.clientId);
  const authUser = authenticatedUser(headerInitData(request));
  if (!Number.isSafeInteger(clientId) || !authUser || authUser.id !== clientId) return reply.code(403).send({ ok: false, error: 'Forbidden' });
  return { ok: true, trainer: getClientTrainer(clientId) ?? null };
});

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
app.listen({ port, host }).catch((error) => { app.log.error(error); process.exit(1); });
