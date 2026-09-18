import { useEffect, useState } from 'react';

type Props = { clientId: string; initData: string };

export function ClientPayments({ clientId, initData }: Props) {
  const [payments, setPayments] = useState<any[]>([]);
  const [form, setForm] = useState({ amount: '', package_name: '', sessions_purchased: '', paid_at: new Date().toISOString().slice(0, 16), valid_until: '', comment: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const response = await fetch(`/api/trainer/crm/clients/${clientId}/payments`, { headers: { 'x-telegram-init-data': initData } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? 'Не удалось загрузить оплаты');
    setPayments(body.payments ?? []);
  };

  useEffect(() => { void load().catch((e) => setError(e.message)); }, [clientId, initData]);

  async function save() {
    setSaving(true); setError('');
    try {
      const payload = {
        amount: Number(form.amount),
        package_name: form.package_name || null,
        sessions_purchased: form.sessions_purchased ? Number(form.sessions_purchased) : null,
        paid_at: form.paid_at ? new Date(form.paid_at).toISOString() : undefined,
        valid_until: form.valid_until || null,
        comment: form.comment || null,
        status: 'active',
      };
      const response = await fetch(`/api/trainer/crm/clients/${clientId}/payments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Не удалось сохранить оплату');
      setForm({ amount: '', package_name: '', sessions_purchased: '', paid_at: new Date().toISOString().slice(0, 16), valid_until: '', comment: '' });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка сохранения'); }
    finally { setSaving(false); }
  }

  async function setUsed(payment: any) {
    const next = window.prompt('Сколько тренировок использовано?', String(payment.sessions_used ?? 0));
    if (next === null) return;
    const used = Number(next);
    if (!Number.isInteger(used) || used < 0) return;
    const response = await fetch(`/api/trainer/crm/clients/${clientId}/payments/${payment.id}/usage`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData },
      body: JSON.stringify({ sessions_used: used }),
    });
    if (!response.ok) { const body = await response.json(); setError(body.error ?? 'Не удалось обновить'); return; }
    await load();
  }

  return <section>
    <h2>Оплата</h2>
    {error && <p role="alert">{error}</p>}
    <div>
      <input type="number" min="0.01" step="0.01" placeholder="Сумма, ₽" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
      <input placeholder="Название пакета" value={form.package_name} onChange={(e) => setForm({ ...form, package_name: e.target.value })} />
      <input type="number" min="0" step="1" placeholder="Тренировок куплено" value={form.sessions_purchased} onChange={(e) => setForm({ ...form, sessions_purchased: e.target.value })} />
      <input type="datetime-local" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} />
      <input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
      <textarea placeholder="Комментарий" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
      <button type="button" disabled={saving || !form.amount} onClick={() => void save()}>{saving ? 'Сохраняем…' : 'Добавить оплату'}</button>
    </div>
    <h3>История оплат</h3>
    {payments.length === 0 ? <p>Оплат пока нет.</p> : <ul>{payments.map((payment) => {
      const remaining = payment.sessions_purchased == null ? null : Math.max(0, payment.sessions_purchased - (payment.sessions_used ?? 0));
      return <li key={payment.id}>
        <strong>{payment.amount} {payment.currency}</strong>
        {payment.package_name && ` · ${payment.package_name}`}
        {payment.sessions_purchased != null && ` · ${payment.sessions_used ?? 0}/${payment.sessions_purchased} · осталось ${remaining}`}
        {payment.valid_until && ` · до ${payment.valid_until}`}
        {' '}<button type="button" onClick={() => void setUsed(payment)}>Изменить использовано</button>
      </li>;
    })}</ul>}
  </section>;
}
