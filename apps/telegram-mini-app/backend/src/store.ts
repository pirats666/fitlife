import type { TelegramUser } from './telegram-auth.js';

export type FitLifeUser = TelegramUser & {
  role: 'client' | 'trainer';
  onboardingCompleted: boolean;
  goal?: 'health' | 'strength' | 'fitness';
  createdAt: string;
  updatedAt: string;
};

export type WorkoutHistoryItem = {
  workoutId: string;
  completedAt: string;
};

const users = new Map<number, FitLifeUser>();
const workoutHistory = new Map<number, WorkoutHistoryItem[]>();

export function upsertUser(telegramUser: TelegramUser): FitLifeUser {
  const now = new Date().toISOString();
  const existing = users.get(telegramUser.id);

  const user: FitLifeUser = {
    ...(existing ?? {
      role: 'client',
      onboardingCompleted: false,
      createdAt: now
    }),
    ...telegramUser,
    updatedAt: now
  };

  users.set(user.id, user);
  return user;
}

export function getUser(id: number): FitLifeUser | undefined {
  return users.get(id);
}

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
