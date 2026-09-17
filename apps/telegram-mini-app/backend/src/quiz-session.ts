import type { QuizExperience, QuizGoal, QuizLocation, ProgramSlug } from './quiz.js';

export type QuizSession = {
  goal?: QuizGoal;
  location?: QuizLocation;
  experience?: QuizExperience;
  program?: ProgramSlug;
  resultId?: string;
  source?: string;
  campaign?: string;
};

const sessions = new Map<number, QuizSession>();

export function getQuizSession(id: number) { return sessions.get(id); }
export function startQuiz(id: number, source?: string, campaign?: string) {
  const session: QuizSession = { source, campaign };
  sessions.set(id, session);
  return session;
}
export function updateQuizSession(id: number, patch: Partial<QuizSession>) {
  const session = sessions.get(id) ?? {};
  Object.assign(session, patch);
  sessions.set(id, session);
  return session;
}
export function clearQuizSession(id: number) { sessions.delete(id); }
