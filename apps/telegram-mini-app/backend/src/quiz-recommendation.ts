export type QuizGoal = 'weight_loss' | 'muscle_gain' | 'fitness' | 'strength';
export type QuizLocation = 'home' | 'outdoor' | 'gym';
export type QuizExperience = 'beginner' | 'returning' | 'regular';

export type RecommendedProgram =
  | 'full_body_beginner'
  | 'full_body_home'
  | 'outdoor_full_body'
  | 'three_day_split';

export function recommendProgram(
  _goal: QuizGoal,
  location: QuizLocation,
  experience: QuizExperience,
): RecommendedProgram {
  if (location === 'home') return 'full_body_home';
  if (location === 'outdoor') return 'outdoor_full_body';
  if (experience === 'regular') return 'three_day_split';
  return 'full_body_beginner';
}

export const goalLabels: Record<QuizGoal, string> = {
  weight_loss: 'похудеть',
  muscle_gain: 'набрать мышечную массу',
  fitness: 'улучшить форму и выносливость',
  strength: 'стать сильнее',
};

export const locationLabels: Record<QuizLocation, string> = {
  home: 'дома',
  outdoor: 'на спортплощадке',
  gym: 'в зале',
};

export const experienceLabels: Record<QuizExperience, string> = {
  beginner: 'новичок',
  returning: 'тренировался раньше, но был перерыв',
  regular: 'тренируюсь регулярно',
};

export const programLabels: Record<RecommendedProgram, { title: string; description: string }> = {
  full_body_beginner: {
    title: 'FULL BODY — МИКРОЦИКЛ ДЛЯ НОВИЧКА',
    description: '3 тренировки в неделю. Осваиваем базовые движения, выстраиваем регулярность и постепенно увеличиваем нагрузку.',
  },
  full_body_home: {
    title: 'FULL BODY HOME',
    description: 'Стартовая программа для тренировок дома с акцентом на базовые движения и постепенное развитие.',
  },
  outdoor_full_body: {
    title: 'OUTDOOR FULL BODY',
    description: 'Тренировки на спортплощадке с собственным весом и постепенным увеличением объёма работы.',
  },
  three_day_split: {
    title: '3-DAY SPLIT',
    description: 'Трёхдневная программа для человека с регулярным опытом тренировок в зале.',
  },
};

export function goalRecommendation(goal: QuizGoal): string {
  switch (goal) {
    case 'weight_loss':
      return 'Твоя цель — снижение веса. На старте важно не искать «идеальную» тренировку, а выстроить регулярную силовую нагрузку и питание, которое ты сможешь соблюдать.';
    case 'muscle_gain':
      return 'Твоя цель — набор мышечной массы. Основной акцент — регулярные силовые тренировки, прогрессия нагрузки и достаточное питание.';
    case 'fitness':
      return 'Твоя цель — улучшить общую физическую форму. Начинаем с базовых движений, регулярности и постепенного увеличения объёма работы.';
    case 'strength':
      return 'Твоя цель — стать сильнее. На старте важно освоить технику базовых движений и постепенно прогрессировать в нагрузке.';
  }
}
