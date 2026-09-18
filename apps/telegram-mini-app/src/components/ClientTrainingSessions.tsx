import { useEffect, useState } from 'react';

type Exercise = {
  id: string;
  exercise_name: string;
  sets?: number | null;
  reps?: string | null;
  working_weight?: number | null;
  rest_seconds?: number | null;
  coach_comment?: string | null;
};

type Workout = {
  id: string;
  day_number: number;
  title: string;
  notes?: string | null;
  training_programs: { id: string; name: string; version: number; status: string };
  exercises: Exercise[];
};

type HistoryItem = {
  id: string;
  workout_day_id?: string | null;
  performed_at: string;
  duration_minutes?: number | null;
  rpe?: number | null;
  notes?: string | null;
};

type Props = {
  clientId: string;
  initData: string;
};

export function ClientTrainingSessions({ clientId, initData }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [duration, setDuration] = useState('');
  const [rpe, setRpe] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/trainer/crm/clients/${clientId}/training-sessions`, {
        headers: { 'x-telegram-init-data': initData },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Не удалось загрузить тренировки');
      setWorkouts(body.workouts ?? []);
      setHistory(body.history ?? []);
      if (!selectedDay && body.workouts?.[0]?.id) setSelectedDay(body.workouts[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [clientId, initData]);

  async function markCompleted() {
    if (!selectedDay) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/trainer/crm/clients/${clientId}/training-sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData },
        body: JSON.stringify({
          workout_day_id: selectedDay,
          duration_minutes: duration ? Number(duration) : null,
          rpe: rpe ? Number(rpe) : null,
          notes: notes || null,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Не удалось сохранить');
      setDuration('');
      setRpe('');
      setNotes('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Загрузка тренировок…</div>;

  return (
    <section>
      <h3>Тренировки клиента</h3>
      {error && <p role="alert">{error}</p>}

      <div>
        <label>
          Тренировка
          <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)}>
            {workouts.map((workout) => (
              <option key={workout.id} value={workout.id}>
                День {workout.day_number}: {workout.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {workouts.find((workout) => workout.id === selectedDay)?.exercises.map((exercise) => (
        <div key={exercise.id}>
          <strong>{exercise.exercise_name}</strong>
          <span>
            {' '}— {exercise.sets ?? '—'} × {exercise.reps ?? '—'}
            {exercise.working_weight != null ? ` · ${exercise.working_weight} кг` : ''}
            {exercise.rest_seconds != null ? ` · отдых ${exercise.rest_seconds} сек` : ''}
          </span>
          {exercise.coach_comment && <small> · {exercise.coach_comment}</small>}
        </div>
      ))}

      <div>
        <input type="number" min="1" placeholder="Длительность, мин" value={duration} onChange={(e) => setDuration(e.target.value)} />
        <input type="number" min="1" max="10" step="0.5" placeholder="RPE 1–10" value={rpe} onChange={(e) => setRpe(e.target.value)} />
        <textarea placeholder="Комментарий" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button type="button" disabled={saving || !selectedDay} onClick={() => void markCompleted()}>
          {saving ? 'Сохраняем…' : 'Отметить выполненной'}
        </button>
      </div>

      <h4>История</h4>
      {history.length === 0 ? <p>Пока нет выполненных тренировок.</p> : (
        <ul>
          {history.map((item) => {
            const workout = workouts.find((candidate) => candidate.id === item.workout_day_id);
            return (
              <li key={item.id}>
                {new Date(item.performed_at).toLocaleString('ru-RU')} — {workout?.title ?? 'Тренировка'}
                {item.duration_minutes != null ? ` · ${item.duration_minutes} мин` : ''}
                {item.rpe != null ? ` · RPE ${item.rpe}` : ''}
                {item.notes ? ` · ${item.notes}` : ''}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
