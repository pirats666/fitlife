import React, { useState } from "react";
import type { ClientSummary } from "../services/clients";

type Props = {
  onCreated: (client: ClientSummary) => void;
  apiBaseUrl?: string;
  initData?: string;
};

export function CreateClientForm({ onCreated, apiBaseUrl = "", initData = "" }: Props) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", telegram_username: "", telegram_id: "",
    goal: "", goal_details: "", training_experience: "", age: "",
    training_location: "", equipment: "", training_days_per_week: "3",
    session_duration_minutes: "60", movement_limitations: "", recovery_notes: "", coach_notes: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(null);
    try {
      const payload: Record<string, unknown> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        telegram_username: form.telegram_username.trim().replace(/^@/, "") || null,
        goal: form.goal || null,
        goal_details: form.goal_details.trim() || null,
        training_experience: form.training_experience || null,
        training_location: form.training_location || null,
        equipment: form.equipment.split(",").map(x => x.trim()).filter(Boolean),
        movement_limitations: form.movement_limitations.trim() || null,
        recovery_notes: form.recovery_notes.trim() || null,
        coach_notes: form.coach_notes.trim() || null,
        status: "lead",
        training_days_per_week: Number(form.training_days_per_week) || null,
        session_duration_minutes: Number(form.session_duration_minutes) || null
      };
      if (form.age.trim()) payload.age = Number(form.age);
      if (form.telegram_id.trim()) payload.telegram_id = Number(form.telegram_id);

      const response = await fetch(`${apiBaseUrl}/api/trainer/crm/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(initData ? { "x-telegram-init-data": initData } : {}) },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось создать клиента");
      onCreated(result.client);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать клиента");
    } finally { setSaving(false); }
  }

  return <form onSubmit={submit} aria-label="Новый клиент">
    <h2>Новый клиент</h2>
    {error && <p role="alert">{error}</p>}

    <input required value={form.first_name} onChange={e => set("first_name", e.target.value)} placeholder="Имя *" />
    <input value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="Фамилия" />
    <input value={form.telegram_username} onChange={e => set("telegram_username", e.target.value)} placeholder="@username" />
    <input inputMode="numeric" value={form.telegram_id} onChange={e => set("telegram_id", e.target.value)} placeholder="Telegram ID" />

    <select value={form.goal} onChange={e => set("goal", e.target.value)}>
      <option value="">Цель</option>
      <option value="Похудение">Похудение</option>
      <option value="Набор мышечной массы">Набор мышечной массы</option>
      <option value="Сила">Сила</option>
      <option value="Общее здоровье и форма">Общее здоровье и форма</option>
    </select>

    <textarea value={form.goal_details} onChange={e => set("goal_details", e.target.value)} placeholder="Подробнее о цели" />
    <select value={form.training_experience} onChange={e => set("training_experience", e.target.value)}>
      <option value="">Опыт тренировок</option><option>Новичок</option><option>Средний</option><option>Продвинутый</option>
    </select>
    <input inputMode="numeric" value={form.age} onChange={e => set("age", e.target.value)} placeholder="Возраст" />
    <select value={form.training_location} onChange={e => set("training_location", e.target.value)}>
      <option value="">Место тренировок</option><option>Зал</option><option>Дом</option><option>Улица</option><option>Смешанный формат</option>
    </select>
    <input value={form.equipment} onChange={e => set("equipment", e.target.value)} placeholder="Оборудование через запятую" />
    <input inputMode="numeric" value={form.training_days_per_week} onChange={e => set("training_days_per_week", e.target.value)} placeholder="Тренировок в неделю" />
    <input inputMode="numeric" value={form.session_duration_minutes} onChange={e => set("session_duration_minutes", e.target.value)} placeholder="Длительность, минут" />
    <textarea value={form.movement_limitations} onChange={e => set("movement_limitations", e.target.value)} placeholder="Ограничения по движениям" />
    <textarea value={form.recovery_notes} onChange={e => set("recovery_notes", e.target.value)} placeholder="Восстановление / сон" />
    <textarea value={form.coach_notes} onChange={e => set("coach_notes", e.target.value)} placeholder="Заметки тренера" />

    <button type="submit" disabled={saving}>{saving ? "Сохраняем…" : "Создать клиента"}</button>
  </form>;
}
