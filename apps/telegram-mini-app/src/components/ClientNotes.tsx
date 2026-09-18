import { useEffect, useState } from 'react';

type Props = { clientId: string; initData: string };

export function ClientNotes({ clientId, initData }: Props) {
  const [notes, setNotes] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch(`/api/trainer/crm/clients/${clientId}/notes`, {
      headers: { 'x-telegram-init-data': initData },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? 'Не удалось загрузить заметки');
    setNotes(body.notes ?? []);
  }

  useEffect(() => { void load().catch((e) => setError(e.message)); }, [clientId, initData]);

  async function addNote() {
    if (!note.trim()) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/trainer/crm/clients/${clientId}/notes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData },
        body: JSON.stringify({ note }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Не удалось сохранить заметку');
      setNote('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  return <section>
    <h2>Заметки тренера</h2>
    {error && <p role="alert">{error}</p>}
    <textarea
      value={note}
      maxLength={5000}
      placeholder="Например: обсудили цель, самочувствие, изменения программы…"
      onChange={(e) => setNote(e.target.value)}
    />
    <button type="button" disabled={saving || !note.trim()} onClick={() => void addNote()}>
      {saving ? 'Сохраняем…' : 'Добавить заметку'}
    </button>

    {notes.length === 0 ? <p>Заметок пока нет.</p> : <ul>{notes.map((item) =>
      <li key={item.id}>
        <div>{item.note}</div>
        <small>{new Date(item.created_at).toLocaleString('ru-RU')}</small>
      </li>
    )}</ul>}
  </section>;
}
