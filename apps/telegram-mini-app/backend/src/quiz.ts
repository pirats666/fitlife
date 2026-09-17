export type QuizGoal = 'weight_loss' | 'muscle_gain' | 'fitness' | 'strength';
export type QuizLocation = 'home' | 'outdoor' | 'gym';
export type QuizExperience = 'beginner' | 'returning' | 'regular';

export type ProgramSlug = 'full_body_beginner' | 'full_body_home' | 'outdoor_full_body' | 'three_day_split';

export function recommendProgram(location: QuizLocation, experience: QuizExperience): ProgramSlug {
  if (location === 'home') return 'full_body_home';
  if (location === 'outdoor') return 'outdoor_full_body';
  return experience === 'regular' ? 'three_day_split' : 'full_body_beginner';
}

export const goalLabels: Record<QuizGoal, string> = {
  weight_loss: '🔥 Похудеть',
  muscle_gain: '💪 Набрать мышечную массу',
  fitness: '🏃 Улучшить форму и выносливость',
  strength: '🧱 Стать сильнее',
};

export const locationLabels: Record<QuizLocation, string> = {
  home: '🏠 Дома', outdoor: '🌳 На спортплощадке', gym: '🏋️ В зале',
};

export const experienceLabels: Record<QuizExperience, string> = {
  beginner: '🌱 Я новичок', returning: '🔄 Тренировался раньше, но был перерыв', regular: '💪 Тренируюсь регулярно',
};

export function goalRecommendation(goal: QuizGoal): string {
  switch (goal) {
    case 'weight_loss': return 'Сделай ставку на регулярные тренировки и питание, которого реально придерживаться.';
    case 'muscle_gain': return 'Сосредоточься на регулярных силовых тренировках, технике и постепенном увеличении нагрузки.';
    case 'fitness': return 'Начни с базовых движений, регулярности и постепенного увеличения тренировочного объёма.';
    case 'strength': return 'Освой технику базовых движений и постепенно увеличивай нагрузку без резких скачков.';
  }
}
