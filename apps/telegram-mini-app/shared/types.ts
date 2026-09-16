export type Goal = 'health' | 'strength' | 'fitness';

export interface UserProfile {
  telegramId: number;
  firstName: string;
  username?: string;
  goal?: Goal;
  onboardingCompleted: boolean;
}

export type ExerciseMode = 'reps' | 'seconds';

export interface Exercise {
  id: string;
  name: string;
  target: string;
  mode: ExerciseMode;
  value: number;
  restSeconds: number;
  instructions: string;
}

export interface Workout {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  level: 'beginner' | 'intermediate';
  equipment: 'bodyweight';
  exercises: Exercise[];
}

export interface WorkoutHistoryItem {
  workoutId: string;
  completedAt: string;
}

export interface ProgressSummary {
  totalWorkouts: number;
  completedThisWeek: number;
  lastCompletedAt: string | null;
}

export interface ScheduleDay {
  day: number;
  label: string;
  workoutId: string | null;
}
