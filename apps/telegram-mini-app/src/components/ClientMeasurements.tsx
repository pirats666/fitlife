import { useEffect, useState } from 'react';

type Props = { clientId: string; initData: string };

export function ClientMeasurements({ clientId, initData }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ measured_on: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const response = await fetch(`/api/trainer/crm/clients/${clientId}/measurements`, {
      headers: { 'x-telegram-init-data': initData },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? 'Не удалось загрузить замеры');
    setItems(body.measurements ?? []);
  };

  useEffect(() => { void load().catch((e) => setError(e.message)); }, [clientId, initData]);

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function save() {
    setSaving(true); setError('');
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, value]) => value !== '').map(([key, value]) => [
          key,
          key === 'measured_on' || key === 'notes' ? value : Number(value),
        ]),
      );
      const response = await fetch(`/api/trainer/crm/clients/${clientId}/measurements`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Не удалось сохранить замер');
      setForm({ measured_on: new Date().toISOString().slice(0, 10) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally { setSaving(false); }
  }

  const fields = [
    ['body_weight_kg', 'Вес, кг'],
    ['chest_cm', 'Грудь, см'],
    ['waist_cm', 'Талия, см'],
    ['hips_cm', 'Бёдра, см'],
    ['arm_cm', 'Рука, см'],
    ['thigh_cm', 'Бедро, см'],
    ['body_fat_percent', 'Жир, %'],
  ];

  return <section>
    <h2>Замеры</h2>
    {error && <p role="alert">{error}</p>}
    <label>Дата <input type="date" value={form.measured_on ?? ''} onChange={(e) => set('measured_on', e.target.value)} /></label>
    {fields.map(([key, label]) => (
      <label key={key}>{label} <input type="number" step="0.1" value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)} /></label>
    ))}
    <label>Комментарий <textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></label>
    <button type="button" disabled={saving} onClick={() => void save()}>{saving ? 'Сохраняем…' : 'Добавить замер'}</button>

    <h3>История</h3>
    {items.length === 0 ? <p>Замеров пока нет.</p> : <ul>
      {items.map((item) => <li key={item.id}>
        <strong>{item.measured_on}</strong>
        {item.body_weight_kg != null && ` · ${item.body_weight_kg} кг`}
        {item.waist_cm != null && ` · талия ${item.waist_cm} см`}
        {item.body_fat_percent != null && ` · жир ${item.body_fat_percent}%`}
        {item.notes && ` · ${item.notes}`}
      </li>)}
    </ul>}
  </section>;
}
