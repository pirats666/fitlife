export type Exercise = {
  id: string;
  name: string;
  target: string;
  mode: 'reps' | 'seconds';
  value: number;
  restSeconds: number;
  instructions: string;
};

export type Workout = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  level: 'beginner' | 'intermediate';
  equipment: 'bodyweight';
  exercises: Exercise[];
};

export const workouts: Workout[] = [
  {
    id: 'open-workout-1',
    title: 'Открытая тренировка №1',
    description: 'Тренировка с собственным весом на всё тело: ноги, ягодицы, грудь, плечи, спина, корпус и лёгкое кардио.',
    durationMinutes: 25,
    level: 'beginner',
    equipment: 'bodyweight',
    exercises: [
      { id: 'squat', name: 'Приседания', target: 'Ноги и ягодицы', mode: 'reps', value: 12, restSeconds: 30, instructions: 'Стопы примерно на ширине плеч. Опускайся плавно, держи корпус устойчиво и вставай без резкого рывка.' },
      { id: 'reverse-lunge', name: 'Обратные выпады', target: 'Ноги и ягодицы', mode: 'reps', value: 8, restSeconds: 30, instructions: 'Сделай шаг назад, опустись контролируемо и вернись в исходное положение. Чередуй ноги.' },
      { id: 'push-up', name: 'Отжимания', target: 'Грудь, плечи и руки', mode: 'reps', value: 8, restSeconds: 30, instructions: 'Держи тело ровно и двигайся плавно. При необходимости используй более лёгкий вариант с опорой на высокую устойчивую поверхность.' },
      { id: 'good-morning', name: 'Good Morning', target: 'Задняя поверхность тела и спина', mode: 'reps', value: 10, restSeconds: 30, instructions: 'Слегка согни колени, отведи таз назад и наклони корпус с нейтральной спиной. Вернись в исходное положение.' },
      { id: 'dead-bug', name: 'Dead Bug', target: 'Мышцы корпуса', mode: 'reps', value: 8, restSeconds: 30, instructions: 'Лёжа на спине, выполняй медленные противоположные движения рукой и ногой, сохраняя контроль корпуса.' },
      { id: 'marching', name: 'Активная ходьба на месте', target: 'Лёгкое кардио', mode: 'seconds', value: 45, restSeconds: 30, instructions: 'Шагай на месте в комфортном темпе, двигая руками. Темп должен позволять сохранять контроль и нормальное дыхание.' }
    ]
  }
];

export function getWorkout(id: string): Workout | undefined {
  return workouts.find((workout) => workout.id === id);
}
