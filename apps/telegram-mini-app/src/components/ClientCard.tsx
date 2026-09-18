import { useState } from "react";

type Section = "overview" | "program" | "nutrition" | "measurements" | "payments" | "notes";

export function ClientCard({ client }: { client: any }) {
  const [section, setSection] = useState<Section>("overview");

  const tabs: [Section, string][] = [
    ["overview", "Обзор"],
    ["program", "Тренировки"],
    ["nutrition", "Питание"],
    ["measurements", "Замеры"],
    ["payments", "Оплата"],
    ["notes", "Заметки"],
  ];

  return (
    <main className="client-card">
      <header className="client-card__header">
        <div>
          <h1>{client.first_name} {client.last_name ?? ""}</h1>
          {client.telegram_username && <p>@{client.telegram_username}</p>}
          <span className="client-card__status">{client.status}</span>
        </div>
        {client.telegram_username && (
          <a href={`https://t.me/${client.telegram_username}`} target="_blank" rel="noreferrer">
            Написать клиенту
          </a>
        )}
      </header>

      <nav className="client-card__tabs" aria-label="Разделы клиента">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)} aria-current={section === id}>
            {label}
          </button>
        ))}
      </nav>

      <section className="client-card__content">
        {section === "overview" && (
          <div>
            <h2>Цель</h2>
            <p>{client.goal || "Цель не указана"}</p>
            <h2>Опыт</h2>
            <p>{client.training_experience || "Не указан"}</p>
            <h2>Ограничения</h2>
            <p>{client.movement_limitations || "Нет данных"}</p>
            <h2>Заметки</h2>
            <p>{client.coach_notes || "Нет заметок"}</p>
          </div>
        )}

        {section === "program" && <div><h2>Программа тренировок</h2><p>Текущая программа клиента.</p></div>}
        {section === "nutrition" && <div><h2>План питания</h2><p>Текущий план питания клиента.</p></div>}
        {section === "measurements" && <div><h2>Замеры</h2><p>История замеров и динамика.</p></div>}
        {section === "payments" && <div><h2>Оплата</h2><p>Пакеты, проведённые и оставшиеся тренировки.</p></div>}
        {section === "notes" && <div><h2>Заметки тренера</h2><p>История заметок.</p></div>}
      </section>
    </main>
  );
}
