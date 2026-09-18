export const startKeyboard = { inline_keyboard: [[{ text: '🚀 НАЧАТЬ ТЕСТ', callback_data: 'quiz:start' }]] };

export const goalKeyboard = { inline_keyboard: [
  [{ text: '🔥 Похудеть', callback_data: 'quiz:goal:weight_loss' }],
  [{ text: '💪 Набрать мышечную массу', callback_data: 'quiz:goal:muscle_gain' }],
  [{ text: '🏃 Улучшить форму и выносливость', callback_data: 'quiz:goal:fitness' }],
  [{ text: '🧱 Стать сильнее', callback_data: 'quiz:goal:strength' }],
] };

export const locationKeyboard = { inline_keyboard: [
  [{ text: '🏠 Дома', callback_data: 'quiz:location:home' }],
  [{ text: '🌳 На спортплощадке', callback_data: 'quiz:location:outdoor' }],
  [{ text: '🏋️ В зале', callback_data: 'quiz:location:gym' }],
] };

export const experienceKeyboard = { inline_keyboard: [
  [{ text: '🌱 Я новичок', callback_data: 'quiz:experience:beginner' }],
  [{ text: '🔄 Тренировался раньше, но был перерыв', callback_data: 'quiz:experience:returning' }],
  [{ text: '💪 Тренируюсь регулярно', callback_data: 'quiz:experience:regular' }],
] };

export const programKeyboard = { inline_keyboard: [[{ text: '📄 ПОЛУЧИТЬ ПРОГРАММУ', callback_data: 'quiz:program' }]] };
export const afterProgramKeyboard = { inline_keyboard: [
  [{ text: '🎯 ИНДИВИДУАЛЬНАЯ ПРОГРАММА', callback_data: 'quiz:offer' }],
  [{ text: '🔄 ПРОЙТИ ТЕСТ ЗАНОВО', callback_data: 'quiz:restart' }],
] };
