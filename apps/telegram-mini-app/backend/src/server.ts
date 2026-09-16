import 'dotenv/config';
import Fastify from 'fastify';
import { validateTelegramInitData } from './telegram-auth.js';
import { getUser, updateUser, upsertUser, completeWorkout, getWorkoutHistory } from './store.js';
import { getWorkout, workouts } from './workouts.js';
import { getWeeklySchedule } from './schedule.js';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ ok: true, service: 'fitlife-telegram-backend' }));

app.post<{ Body: { initData?: string } }>('/api/auth/telegram', async (request, reply) => {
  try {
    const telegramUser = validateTelegramInitData(request.body?.initData ?? '', process.env.TELEGRAM_BOT_TOKEN ?? '');
    const user = upsertUser(telegramUser);
    return { ok: true, user };
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
  const user = getUser(telegramId);
  if (!Number.isSafeInteger(telegramId) || !user) return reply.code(404).send({ ok: false, error: 'User not found' });
  return { ok: true, user };
});

app.patch<{ Params: { telegramId: string }; Body: { goal?: 'health' | 'strength' | 'fitness'; onboardingCompleted?: boolean } }>('/api/users/:telegramId', async (request, reply) => {
  const telegramId = Number(request.params.telegramId);
  if (!Number.isSafeInteger(telegramId)) return reply.code(400).send({ ok: false, error: 'Invalid telegramId' });

  const user = updateUser(telegramId, request.body ?? {});
  if (!user) return reply.code(404).send({ ok: false, error: 'User not found' });
  return { ok: true, user };
});

app.post<{ Params: { telegramId: string; workoutId: string } }>('/api/users/:telegramId/workouts/:workoutId/complete', async (request, reply) => {
  const telegramId = Number(request.params.telegramId);
  if (!Number.isSafeInteger(telegramId)) return reply.code(400).send({ ok: false, error: 'Invalid telegramId' });
  if (!getWorkout(request.params.workoutId)) return reply.code(404).send({ ok: false, error: 'Workout not found' });

  const history = completeWorkout(telegramId, request.params.workoutId);
  if (!history) return reply.code(404).send({ ok: false, error: 'User not found' });
  return { ok: true, history };
});

app.get<{ Params: { telegramId: string } }>('/api/users/:telegramId/workouts/history', async (request, reply) => {
  const telegramId = Number(request.params.telegramId);
  if (!Number.isSafeInteger(telegramId)) return reply.code(400).send({ ok: false, error: 'Invalid telegramId' });

  const history = getWorkoutHistory(telegramId);
  if (!history) return reply.code(404).send({ ok: false, error: 'User not found' });
  return { ok: true, history };
});

app.get('/api/schedule', async () => ({ ok: true, schedule: getWeeklySchedule() }));

app.get<{ Params: { telegramId: string } }>('/api/users/:telegramId/progress', async (request, reply) => {
  const telegramId = Number(request.params.telegramId);
  if (!Number.isSafeInteger(telegramId)) return reply.code(400).send({ ok: false, error: 'Invalid telegramId' });

  const history = getWorkoutHistory(telegramId);
  if (!history) return reply.code(404).send({ ok: false, error: 'User not found' });

  const now = new Date();
  const weekStart = new Date(now);
  const day = weekStart.getDay() || 7;
  weekStart.setDate(weekStart.getDate() - day + 1);
  weekStart.setHours(0, 0, 0, 0);

  const completedThisWeek = history.filter((item) => new Date(item.completedAt) >= weekStart).length;
  const lastCompletedAt = history[0]?.completedAt ?? null;

  return {
    ok: true,
    progress: {
      totalWorkouts: history.length,
      completedThisWeek,
      lastCompletedAt
    }
  };
});

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

app.listen({ port, host }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
