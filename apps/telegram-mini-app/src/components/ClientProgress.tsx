import { useEffect, useState } from 'react';

type Props = { clientId: string; initData: string };

export function ClientProgress({ clientId, initData }: Props) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/trainer/crm/clients/${clientId}/progress`, {
      headers: { 'x-telegram-init-data': initData },
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? 'Не удалось загрузить прогресс');
        setData(body);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'));
  }, [clientId, initData]);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p>Загрузка прогресса…</p>;

  const changes = [
    ['Вес', 'body_weight_kg', 'кг'],
    ['Грудь', 'chest_cm', 'см'],
    ['Талия', 'waist_cm', 'см'],
    ['Бёдра', 'hips_cm', 'см'],
    ['Рука', 'arm_cm', 'см'],
    ['Бедро', 'thigh_cm', 'см'],
    ['Жир', 'body_fat_percent', '%'],
  ];

  return (
    <section>
      <h2>Прогресс</h2>
      <p>Всего тренировок: <strong>{data.summary.totalWorkouts}</strong></p>
      <p>За эту неделю: <strong>{data.summary.completedThisWeek}</strong></p>
      <p>Последняя тренировка: {data.summary.lastWorkoutAt ? new Date(data.summary.lastWorkoutAt).toLocaleString('ru-RU') : '—'}</p>
      <p>Последний замер: {data.summary.latestMeasurementAt ?? '—'}</p>

      <h3>Изменения между последними двумя замерами</h3>
      {changes.map(([label, key, unit]) => {
        const value = data.changes[key];
        return <p key={key}>{label}: <strong>{value == null ? '—' : `${value > 0 ? '+' : ''}${value} ${unit}`}</strong></p>;
      })}
    </section>
  );
}
