import React, { useState } from "react";

type Exercise = { exercise_name: string; sets: number | ""; reps: string; working_weight: number | ""; rest_seconds: number | ""; coach_comment: string };
type Day = { day_number: number; title: string; notes: string; exercises: Exercise[] };

type Props = { clientId: string; onCreated?: (program: any) => void; apiBaseUrl?: string; initData?: string };

const emptyExercise = (): Exercise => ({ exercise_name: "", sets: 3, reps: "10", working_weight: "", rest_seconds: 90, coach_comment: "" });
const emptyDay = (n: number): Day => ({ day_number: n, title: `Тренировка ${n}`, notes: "", exercises: [emptyExercise()] });

export function TrainingProgramBuilder({ clientId, onCreated, apiBaseUrl = "", initData = "" }: Props) {
  const [name, setName] = useState("Новая программа");
  const [goal, setGoal] = useState("");
  const [rationale, setRationale] = useState("");
  const [days, setDays] = useState<Day[]>([emptyDay(1), emptyDay(2), emptyDay(3)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateDay(index: number, patch: Partial<Day>) {
    setDays(prev => prev.map((day, i) => i === index ? { ...day, ...patch } : day));
  }
  function updateExercise(dayIndex: number, exIndex: number, patch: Partial<Exercise>) {
    setDays(prev => prev.map((day, i) => i === dayIndex ? {
      ...day, exercises: day.exercises.map((ex, j) => j === exIndex ? { ...ex, ...patch } : ex)
    } : day));
  }

  async function save() {
    setSaving(true); setError(null);
    try {
      const payload = {
        name, goal: goal || null, rationale: rationale || null,
        days: days.map(day => ({
          day_number: day.day_number, title: day.title, notes: day.notes || null,
          exercises: day.exercises.filter(ex => ex.exercise_name.trim()).map((ex, i) => ({
            exercise_name: ex.exercise_name.trim(), sort_order: i + 1,
            sets: ex.sets === "" ? null : Number(ex.sets),
            reps: ex.reps || null,
            working_weight: ex.working_weight === "" ? null : Number(ex.working_weight),
            rest_seconds: ex.rest_seconds === "" ? null : Number(ex.rest_seconds),
            coach_comment: ex.coach_comment || null
          }))
        }))
      };
      const response = await fetch(`${apiBaseUrl}/api/trainer/crm/clients/${clientId}/programs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(initData ? { "x-telegram-init-data": initData } : {}) },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось сохранить программу");
      onCreated?.(result.program);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить программу");
    } finally { setSaving(false); }
  }

  return <section aria-label="Создание программы">
    <h2>Новая программа</h2>
    {error && <p role="alert">{error}</p>}
    <input value={name} onChange={e => setName(e.target.value)} placeholder="Название программы" />
    <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Цель" />
    <textarea value={rationale} onChange={e => setRationale(e.target.value)} placeholder="Логика программы / комментарий тренера" />

    {days.map((day, di) => <article key={day.day_number}>
      <input value={day.title} onChange={e => updateDay(di, { title: e.target.value })} />
      <textarea value={day.notes} onChange={e => updateDay(di, { notes: e.target.value })} placeholder="Заметки к тренировке" />
      {day.exercises.map((ex, ei) => <div key={ei}>
        <input required value={ex.exercise_name} onChange={e => updateExercise(di, ei, { exercise_name: e.target.value })} placeholder="Упражнение" />
        <input inputMode="numeric" value={ex.sets} onChange={e => updateExercise(di, ei, { sets: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="Подходы" />
        <input value={ex.reps} onChange={e => updateExercise(di, ei, { reps: e.target.value })} placeholder="Повторы" />
        <input inputMode="decimal" value={ex.working_weight} onChange={e => updateExercise(di, ei, { working_weight: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="Вес" />
        <input inputMode="numeric" value={ex.rest_seconds} onChange={e => updateExercise(di, ei, { rest_seconds: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="Отдых, сек" />
        <input value={ex.coach_comment} onChange={e => updateExercise(di, ei, { coach_comment: e.target.value })} placeholder="Комментарий" />
      </div>)}
      <button type="button" onClick={() => updateDay(di, { exercises: [...day.exercises, emptyExercise()] })}>+ Упражнение</button>
    </article>)}
    <button type="button" onClick={() => setDays(prev => [...prev, emptyDay(prev.length + 1)])}>+ День</button>
    <button type="button" disabled={saving} onClick={save}>{saving ? "Сохраняем…" : "Сохранить программу"}</button>
  </section>;
}
