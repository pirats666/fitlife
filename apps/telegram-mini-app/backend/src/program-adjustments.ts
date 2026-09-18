import { supabase } from './supabase.js';

export type ProgramAdjustment = {
  type: 'increase' | 'maintain' | 'decrease' | 'review';
  signal: string;
  recommendation: string;
};

export async function analyzeClientTrainingResults(clientId: string): Promise<ProgramAdjustment[]> {
  const { data: logs, error } = await supabase
    .from('training_logs')
    .select('performed_at, duration_minutes, rpe, notes')
    .eq('client_id', clientId)
    .order('performed_at', { ascending: false })
    .limit(8);

  if (error) throw new Error(error.message);
  const items = logs ?? [];

  if (!items.length) {
    return [{ type: 'review', signal: 'Нет данных о выполненных тренировках', recommendation: 'Сначала накопить данные о выполнении тренировок, длительности и субъективной нагрузке.' }];
  }

  const recent = items.slice(0, 4);
  const recentRpe = recent.filter((x) => typeof x.rpe === 'number').map((x) => x.rpe as number);
  const avgRpe = recentRpe.length ? recentRpe.reduce((sum, value) => sum + value, 0) / recentRpe.length : null;
  const adjustments: ProgramAdjustment[] = [];

  if (avgRpe !== null && avgRpe >= 9) {
    adjustments.push({ type: 'decrease', signal: `Средний RPE последних тренировок ≈ ${avgRpe.toFixed(1)}`, recommendation: 'Рассмотреть снижение объёма или интенсивности и отдельно проверить восстановление.' });
  } else if (avgRpe !== null && avgRpe <= 6) {
    adjustments.push({ type: 'increase', signal: `Средний RPE последних тренировок ≈ ${avgRpe.toFixed(1)}`, recommendation: 'Если техника стабильна и восстановление достаточное, рассмотреть небольшое увеличение одного параметра нагрузки.' });
  } else {
    adjustments.push({ type: 'maintain', signal: avgRpe === null ? 'RPE не заполнен' : `Средний RPE ≈ ${avgRpe.toFixed(1)}`, recommendation: 'Сохранить текущую нагрузку и продолжить сбор данных.' });
  }

  const durations = recent.filter((x) => typeof x.duration_minutes === 'number' && (x.duration_minutes as number) > 0).map((x) => x.duration_minutes as number);
  if (durations.length >= 2) {
    const avgDuration = durations.reduce((sum, value) => sum + value, 0) / durations.length;
    adjustments.push({ type: 'review', signal: `Средняя длительность последних тренировок ≈ ${Math.round(avgDuration)} мин`, recommendation: 'Сравнить фактическую длительность с плановой и при необходимости перераспределить объём.' });
  }

  if (items.length < 4) {
    adjustments.push({ type: 'review', signal: 'Мало данных для уверенной корректировки', recommendation: 'Не менять программу только по одному-двум наблюдениям; собрать больше результатов.' });
  }

  return adjustments;
}
