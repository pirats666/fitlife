import { useEffect, useState } from 'react';

type Props = { clientId: string; initData: string };

export function ClientNutrition({ clientId, initData }: Props) {
  const [plans, setPlans] = useState<any[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ name: '', goal: '', calories: '', protein_g: '', fat_g: '', carbs_g: '', instructions: '', starts_on: '', ends_on: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const response = await fetch(`/api/trainer/crm/clients/${clientId}/nutrition`, { headers: { 'x-telegram-init-data': initData } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? 'Не удалось загрузить питание');
    setPlans(body.plans ?? []);
  };

  useEffect(() => { void load().catch((e) => setError(e.message)); }, [clientId, initData]);

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function save() {
    setSaving(true); setError('');
    try {
      const numeric = ['calories', 'protein_g', 'fat_g', 'carbs_g'];
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '').map(([k, v]) => [k, numeric.includes(k) ? Number(v) : v]));
      const response = await fetch(`/api/trainer/crm/clients/${clientId}/nutrition`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Не удалось сохранить план');
      setForm({ name: '', goal: '', calories: '', protein_g: '', fat_g: '', carbs_g: '', instructions: '', starts_on: '', ends_on: '' });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка сохранения'); }
    finally { setSaving(false); }
  }

  async function changeStatus(id: string, status: string) {
    const response = await fetch(`/api/trainer/crm/clients/${clientId}/nutrition/${id}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) { const body = await response.json(); throw new Error(body.error ?? 'Не удалось изменить статус'); }
    await load();
  }

  return <section>
    <h2>Питание</h2>
    {error && <p role="alert">{error}</p>}
    <div>
      <input placeholder="Название плана" value={form.name} onChange={(e) => set('name', e.target.value)} />
      <input placeholder="Цель" value={form.goal} onChange={(e) => set('goal', e.target.value)} />
      <input type="number" placeholder="Калории" value={form.calories} onChange={(e) => set('calories', e.target.value)} />
      <input type="number" placeholder="Белки, г" value={form.protein_g} onChange={(e) => set('protein_g', e.target.value)} />
      <input type="number" placeholder="Жиры, г" value={form.fat_g} onChange={(e) => set('fat_g', e.target.value)} />
      <input type="number" placeholder="Углеводы, г" value={form.carbs_g} onChange={(e) => set('carbs_g', e.target.value)} />
      <input type="date" value={form.starts_on} onChange={(e) => set('starts_on', e.target.value)} />
      <input type="date" value={form.ends_on} onChange={(e) => set('ends_on', e.target.value)} />
      <textarea placeholder="Инструкции" value={form.instructions} onChange={(e) => set('instructions', e.target.value)} />
      <button type="button" disabled={saving || !form.name} onClick={() => void save()}>{saving ? 'Сохраняем…' : 'Создать план'}</button>
    </div>
    <h3>Планы</h3>
    {plans.length === 0 ? <p>Планов пока нет.</p> : <ul>{plans.map((plan) => (
      <li key={plan.id}>
        <strong>{plan.name}</strong> · v{plan.version} · {plan.status}
        {plan.calories != null && ` · ${plan.calories} ккал`}
        {plan.protein_g != null && ` · Б ${plan.protein_g} г`}
        {plan.fat_g != null && ` · Ж ${plan.fat_g} г`}
        {plan.carbs_g != null && ` · У ${plan.carbs_g} г`}
        {' '}<button type="button" onClick={() => void changeStatus(plan.id, plan.status === 'active' ? 'completed' : 'active')}>
          {plan.status === 'active' ? 'Завершить' : 'Сделать активным'}
        </button>
      </li>
    ))}</ul>}
  </section>;
}
