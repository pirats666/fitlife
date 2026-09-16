import type { TelegramUser } from './telegram-auth.js';

export type FitLifeUser = TelegramUser & {
  role: 'client' | 'trainer';
  onboardingCompleted: boolean;
  goal?: 'health' | 'strength' | 'fitness';
  createdAt: string;
  updatedAt: string;
};

export type WorkoutHistoryItem = { workoutId: string; completedAt: string };
export type ClientAssignment = { clientId: number; trainerId: number; assignedAt: string };

const users = new Map<number, FitLifeUser>();
const workoutHistory = new Map<number, WorkoutHistoryItem[]>();
const assignments = new Map<number, ClientAssignment>();

function configuredTrainerIds(): Set<number> {
  return new Set((process.env.TRAINER_TELEGRAM_IDS ?? '').split(',').map(Number).filter(Number.isSafeInteger));
}

export function upsertUser(telegramUser: TelegramUser): FitLifeUser {
  const now = new Date().toISOString();
  const existing = users.get(telegramUser.id);
  const role = configuredTrainerIds().has(telegramUser.id) ? 'trainer' : (existing?.role ?? 'client');
  const user: FitLifeUser = { ...(existing ?? { role, onboardingCompleted: false, createdAt: now }), ...telegramUser, role, updatedAt: now };
  users.set(user.id, user);
  return user;
}

export function getUser(id: number): FitLifeUser | undefined { return users.get(id); }
export function getAllUsers(): FitLifeUser[] { return [...users.values()]; }
export function isTrainer(id: number): boolean { return getUser(id)?.role === 'trainer' || configuredTrainerIds().has(id); }

export function updateUser(id: number, patch: Partial<Pick<FitLifeUser, 'goal' | 'onboardingCompleted'>>): FitLifeUser | undefined {
  const existing = users.get(id);
  if (!existing) return undefined;
  const user = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  users.set(id, user);
  return user;
}

export function completeWorkout(userId: number, workoutId: string): WorkoutHistoryItem[] | undefined {
  if (!users.has(userId)) return undefined;
  const history = workoutHistory.get(userId) ?? [];
  history.unshift({ workoutId, completedAt: new Date().toISOString() });
  workoutHistory.set(userId, history.slice(0, 100));
  return workoutHistory.get(userId);
}

export function getWorkoutHistory(userId: number): WorkoutHistoryItem[] | undefined {
  if (!users.has(userId)) return undefined;
  return workoutHistory.get(userId) ?? [];
}

export function assignClient(trainerId: number, clientId: number): ClientAssignment | undefined {
  if (!isTrainer(trainerId) || !users.has(clientId) || users.get(clientId)?.role !== 'client') return undefined;
  const assignment = { clientId, trainerId, assignedAt: new Date().toISOString() };
  assignments.set(clientId, assignment);
  return assignment;
}

export function getTrainerClients(trainerId: number): FitLifeUser[] {
  return [...assignments.values()].filter((item) => item.trainerId === trainerId).map((item) => users.get(item.clientId)).filter((user): user is FitLifeUser => Boolean(user));
}

export function getClientTrainer(clientId: number): FitLifeUser | undefined {
  const assignment = assignments.get(clientId);
  return assignment ? users.get(assignment.trainerId) : undefined;
}
