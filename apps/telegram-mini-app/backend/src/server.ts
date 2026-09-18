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
import { listCrmClients, getCrmClient, createCrmClient, updateCrmClient, addClientNote, addMeasurement, addPayment } from './crm.js';
import { createTrainingProgram, getTrainingProgram } from './programs.js';
import { generateProgramDraft } from './program-generator.js';
import { listClientPrograms, setProgramStatus } from './program-list.js';
import { getClientTrainingSessions, logTrainingSession } from './training-sessions.js';
import { getClientProgress } from './client-progress.js';
import { listClientMeasurements, createClientMeasurement } from './measurements.js';
import { listClientNutritionPlans, createClientNutritionPlan, setNutritionPlanStatus } from './nutrition.js';




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
app.post<{ Body: { initData?: string } }>('/api/auth/telegram', async (request, reply) => { try { return { ok: true, user: await upsertUser(validateTelegramInitData(request.body?.initData ?? '', process.env.TELEGRAM_BOT_TOKEN ?? '')) }; } catch (error) { return reply.code(401).send({ ok: false, error: error instanceof Error ? error.message : 'Unauthorized' }); } });
app.get('/api/workouts', async () => ({ ok: true, workouts }));
app.get<{ Params: { workoutId: string } }>('/api/workouts/:workoutId', async (request, reply) => { const workout = getWorkout(request.params.workoutId); if (!workout) return reply.code(404).send({ ok: false, error: 'Workout not found' }); return { ok: true, workout }; });
app.get<{ Params: { telegramId: string } }>('/api/users/:telegramId', async (request, reply) => { const telegramId = Number(request.params.telegramId); const authUser = await authenticatedUser(headerInitData(request)); if (!Number.isSafeInteger(telegramId) || !authUser || authUser.id !== telegramId) return reply.code(403).send({ ok: false, error: 'Forbidden' }); const user = await getUser(telegramId); if (!user) return reply.code(404).send({ ok: false, error: 'User not found' }); return { ok: true, user }; });
app.patch<{ Params: { telegramId: string }; Body: { goal?: 'health' | 'strength' | 'fitness'; onboardingCompleted?: boolean } }>('/api/users/:telegramId', async (request, reply) => { const telegramId = Number(request.params.telegramId); const authUser = await authenticatedUser(headerInitData(request)); if (!Number.isSafeInteger(telegramId) || !authUser || authUser.id !== telegramId) return reply.code(403).send({ ok: false, error: 'Forbidden' }); const user = await updateUser(telegramId, request.body ?? {}); if (!user) return reply.code(404).send({ ok: false, error: 'User not found' }); return { ok: true, user }; });
app.post<{ Params: { telegramId: string; workoutId: string } }>('/api/users/:telegramId/workouts/:workoutId/complete', async (request, reply) => { const telegramId = Number(request.params.telegramId); const authUser = await authenticatedUser(headerInitData(request)); if (!Number.isSafeInteger(telegramId) || !authUser || authUser.id !== telegramId) return reply.code(403).send({ ok: false, error: 'Forbidden' }); if (!getWorkout(request.params.workoutId)) return reply.code(404).send({ ok: false, error: 'Workout not found' }); const history = await completeWorkout(telegramId, request.params.workoutId); if (!history) return reply.code(404).send({ ok: false, error: 'User not found' }); return { ok: true, history }; });
app.get<{ Params: { telegramId: string } }>('/api/users/:telegramId/workouts/history', async (request, reply) => { const telegramId = Number(request.params.telegramId); const authUser = await authenticatedUser(headerInitData(request)); if (!Number.isSafeInteger(telegramId) || !authUser || authUser.id !== telegramId) return reply.code(403).send({ ok: false, error: 'Forbidden' }); const history = await getWorkoutHistory(telegramId); if (!history) return reply.code(404).send({ ok: false, error: 'User not found' }); return { ok: true, history }; });
app.get('/api/trainer/crm/clients', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  return { ok: true, clients: await listCrmClients() };
});
app.get<{ Params: { clientId: string } }>('/api/trainer/crm/clients/:clientId', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  const client = await getCrmClient(request.params.clientId);
  if (!client) return reply.code(404).send({ ok: false, error: 'Client not found' });
  return { ok: true, client };
});
app.post<{ Body: Record<string, unknown> }>('/api/trainer/crm/clients', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  try { return { ok: true, client: await createCrmClient(request.body ?? {}) }; }
  catch (error) { return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : 'Invalid client' }); }
});
app.patch<{ Params: { clientId: string }; Body: Record<string, unknown> }>('/api/trainer/crm/clients/:clientId', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  try { return { ok: true, client: await updateCrmClient(request.params.clientId, request.body ?? {}) }; }
  catch (error) { return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : 'Invalid client update' }); }
});
app.post<{ Params: { clientId: string }; Body: { note: string } }>('/api/trainer/crm/clients/:clientId/notes', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  try { return { ok: true, note: await addClientNote(request.params.clientId, request.body?.note ?? '') }; }
  catch (error) { return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : 'Invalid note' }); }
});
app.post<{ Params: { clientId: string }; Body: Record<string, unknown> }>('/api/trainer/crm/clients/:clientId/measurements', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  try { return { ok: true, measurement: await addMeasurement(request.params.clientId, request.body ?? {}) }; }
  catch (error) { return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : 'Invalid measurement' }); }
});
app.post<{ Params: { clientId: string }; Body: Record<string, unknown> }>('/api/trainer/crm/clients/:clientId/payments', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  try { return { ok: true, payment: await addPayment(request.params.clientId, request.body ?? {}) }; }
  catch (error) { return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : 'Invalid payment' }); }
});
app.get<{ Params: { clientId: string } }>('/api/trainer/crm/clients/:clientId/programs', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  return { ok: true, programs: await listClientPrograms(request.params.clientId) };
});
app.patch<{ Params: { clientId: string; programId: string }; Body: { status: 'active' | 'draft' | 'completed' | 'archived' } }>('/api/trainer/crm/clients/:clientId/programs/:programId/status', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  try {
    return { ok: true, program: await setProgramStatus(request.params.clientId, request.params.programId, request.body.status) };
  } catch (error) {
    return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : 'Invalid status' });
  }
});
app.post<{ Params: { clientId: string } }>('/api/trainer/crm/clients/:clientId/programs/generate', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  const client = await getCrmClient(request.params.clientId);
  if (!client) return reply.code(404).send({ ok: false, error: 'Client not found' });
  return { ok: true, draft: generateProgramDraft(client) };
});
app.post<{ Params: { clientId: string }; Body: { name: string; goal?: string | null; starts_on?: string | null; ends_on?: string | null; rationale?: string | null; days: Array<{ day_number: number; title: string; notes?: string | null; exercises: Array<{ exercise_id?: string | null; exercise_name: string; sort_order?: number; sets?: number | null; reps?: string | null; working_weight?: number | null; rest_seconds?: number | null; tempo?: string | null; rpe?: number | null; rir?: number | null; coach_comment?: string | null; media_url?: string | null }> }> } }>('/api/trainer/crm/clients/:clientId/programs', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  try {
    const program = await createTrainingProgram(request.params.clientId, request.body);
    return { ok: true, program };
  } catch (error) {
    return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : 'Invalid program' });
  }
});
app.get<{ Params: { clientId: string; programId: string } }>('/api/trainer/crm/clients/:clientId/programs/:programId', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  const program = await getTrainingProgram(request.params.programId);
  if (!program || program.client_id !== request.params.clientId) return reply.code(404).send({ ok: false, error: 'Program not found' });
  return { ok: true, program };
});
app.get<{ Params: { clientId: string } }>('/api/trainer/crm/clients/:clientId/training-sessions', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  try { return { ok: true, ...(await getClientTrainingSessions(request.params.clientId)) }; }
  catch (error) { return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : 'Failed to load training sessions' }); }
});
app.post<{ Params: { clientId: string }; Body: { workout_day_id: string; performed_at?: string; duration_minutes?: number | null; rpe?: number | null; notes?: string | null } }>('/api/trainer/crm/clients/:clientId/training-sessions', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  try { return { ok: true, session: await logTrainingSession(request.params.clientId, request.body) }; }
  catch (error) { return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : 'Invalid training session' }); }
});
app.get<{ Params: { clientId: string } }>('/api/trainer/crm/clients/:clientId/progress', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  try { return { ok: true, ...(await getClientProgress(request.params.clientId)) }; }
  catch (error) { return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : 'Failed to load progress' }); }
});
app.get<{ Params: { clientId: string } }>('/api/trainer/crm/clients/:clientId/measurements', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  try { return { ok: true, measurements: await listClientMeasurements(request.params.clientId) }; }
  catch (error) { return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : 'Failed to load measurements' }); }
});
app.post<{ Params: { clientId: string }; Body: Record<string, unknown> }>('/api/trainer/crm/clients/:clientId/measurements', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  try { return { ok: true, measurement: await createClientMeasurement(request.params.clientId, request.body ?? {}) }; }
  catch (error) { return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : 'Invalid measurement' }); }
});
app.get<{ Params: { clientId: string } }>('/api/trainer/crm/clients/:clientId/nutrition', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  try { return { ok: true, plans: await listClientNutritionPlans(request.params.clientId) }; }
  catch (error) { return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : 'Failed to load nutrition plans' }); }
});
app.post<{ Params: { clientId: string }; Body: Record<string, unknown> }>('/api/trainer/crm/clients/:clientId/nutrition', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  try { return { ok: true, plan: await createClientNutritionPlan(request.params.clientId, request.body ?? {}) }; }
  catch (error) { return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : 'Invalid nutrition plan' }); }
});
app.patch<{ Params: { clientId: string; planId: string }; Body: { status: 'draft' | 'active' | 'completed' | 'archived' } }>('/api/trainer/crm/clients/:clientId/nutrition/:planId/status', async (request, reply) => {
  const authUser = await authenticatedUser(headerInitData(request));
  if (!authUser || !(await isTrainer(authUser.id))) return reply.code(403).send({ ok: false, error: 'Trainer access required' });
  try { return { ok: true, plan: await setNutritionPlanStatus(request.params.clientId, request.params.planId, request.body.status) }; }
  catch (error) { return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : 'Invalid nutrition status' }); }
});
app.get('/api/schedule', async () => ({ ok: true, schedule: getWeeklySchedule() }));
app.get<{ Params: { telegramId: string } }>('/api/users/:telegramId/schedule', async (request, reply) => { const telegramId = Number(request.params.telegramId); const authUser = await authenticatedUser(headerInitData(request)); if (!Number.isSafeInteger(telegramId) || !authUser || authUser.id !== telegramId) return reply.code(403).send({ ok: false, error: 'Forbidden' }); return { ok: true, schedule: await getClientSchedule(telegramId) }; });
app.get<{ Params: { telegramId: string } }>('/api/users/:telegramId/progress', async (request, reply) => { const telegramId = Number(request.params.telegramId); const authUser = await authenticatedUser(headerInitData(request)); if (!Number.isSafeInteger(telegramId) || !authUser || authUser.id !== telegramId) return reply.code(403).send({ ok: false, error: 'Forbidden' }); const history = await getWorkoutHistory(telegramId); if (!history) return reply.code(404).send({ ok: false, error: 'User not found' }); const weekStart = new Date(); const day = weekStart.getDay() || 7; weekStart.setDate(weekStart.getDate() - day + 1); weekStart.setHours(0, 0, 0, 0); return { ok: true, progress: { totalWorkouts: history.length, completedThisWeek: history.filter((item) => new Date(item.completedAt) >= weekStart).length, lastCompletedAt: history[0]?.completedAt ?? null } }; });
app.get<{ Querystring: { trainerId?: string } }>('/api/trainer/clients', async (request, reply) => { const trainerId = Number(request.query.trainerId); if (!Number.isSafeInteger(trainerId) || !(await trainerAuthorized(request, trainerId))) return reply.code(403).send({ ok: false, error: 'Trainer access required' }); return { ok: true, clients: await getTrainerClients(trainerId) }; });
app.post<{ Body: { trainerId?: number; clientId?: number } }>('/api/trainer/clients/assign', async (request, reply) => { const trainerId = Number(request.body?.trainerId); const clientId = Number(request.body?.clientId); if (!Number.isSafeInteger(trainerId) || !Number.isSafeInteger(clientId) || !(await trainerAuthorized(request, trainerId))) return reply.code(403).send({ ok: false, error: 'Trainer access required' }); const assignment = await assignClient(trainerId, clientId); if (!assignment) return reply.code(400).send({ ok: false, error: 'Client assignment failed' }); return { ok: true, assignment }; });
app.get<{ Params: { trainerId: string; clientId: string } }>('/api/trainer/:trainerId/clients/:clientId/progress', async (request, reply) => { const trainerId = Number(request.params.trainerId); const clientId = Number(request.params.clientId); if (!Number.isSafeInteger(trainerId) || !Number.isSafeInteger(clientId) || !(await trainerAuthorized(request, trainerId))) return reply.code(403).send({ ok: false, error: 'Trainer access required' }); if (!(await isClientAssigned(trainerId, clientId))) return reply.code(403).send({ ok: false, error: 'Client is not assigned to this trainer' }); return { ok: true, client: await getUser(clientId), history: await getWorkoutHistory(clientId) ?? [] }; });
app.get<{ Params: { trainerId: string; clientId: string } }>('/api/trainer/:trainerId/clients/:clientId/schedule', async (request, reply) => { const trainerId = Number(request.params.trainerId); const clientId = Number(request.params.clientId); if (!Number.isSafeInteger(trainerId) || !Number.isSafeInteger(clientId) || !(await trainerAuthorized(request, trainerId))) return reply.code(403).send({ ok: false, error: 'Trainer access required' }); if (!(await isClientAssigned(trainerId, clientId))) return reply.code(403).send({ ok: false, error: 'Client is not assigned to this trainer' }); return { ok: true, schedule: await getClientSchedule(clientId) }; });
app.put<{ Params: { trainerId: string; clientId: string }; Body: { schedule?: Array<{ day: number; workoutId: string | null }> } }>('/api/trainer/:trainerId/clients/:clientId/schedule', async (request, reply) => { const trainerId = Number(request.params.trainerId); const clientId = Number(request.params.clientId); if (!Number.isSafeInteger(trainerId) || !Number.isSafeInteger(clientId) || !(await trainerAuthorized(request, trainerId))) return reply.code(403).send({ ok: false, error: 'Trainer access required' }); try { const schedule = await setClientSchedule(trainerId, clientId, request.body?.schedule ?? [], workouts); if (!schedule) return reply.code(403).send({ ok: false, error: 'Client is not assigned to this trainer' }); return { ok: true, schedule }; } catch (error) { return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : 'Invalid schedule' }); } });
app.get<{ Params: { clientId: string } }>('/api/users/:clientId/trainer', async (request, reply) => { const clientId = Number(request.params.clientId); const authUser = await authenticatedUser(headerInitData(request)); if (!Number.isSafeInteger(clientId) || !authUser || authUser.id !== clientId) return reply.code(403).send({ ok: false, error: 'Forbidden' }); return { ok: true, trainer: await getClientTrainer(clientId) ?? null }; });

const port = Number(process.env.PORT ?? 3000); const host = process.env.HOST ?? '0.0.0.0';
await app.listen({ port, host });
