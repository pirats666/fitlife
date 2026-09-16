export type Goal = 'loss' | 'mass' | 'health';

export interface UserProfile {
  telegramId: number;
  firstName: string;
  goal?: Goal;
  weight?: number;
  height?: number;
  age?: number;
}

export interface Workout {
  id: string;
  title: string;
  durationMinutes: number;
  level: 'beginner' | 'intermediate' | 'advanced';
}
