import React, { useEffect, useMemo, useState } from "react";
import type { ClientSummary, ClientsRepository } from "../services/clients";

type Props = {
  repository: ClientsRepository;
  onOpenClient: (client: ClientSummary) => void;
};

export function ClientsList({ repository, onOpenClient }: Props) {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ClientSummary["status"]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    repository.list()
      .then(data => { if (active) setClients(data); })
      .catch(err => { if (active) setError(err?.message ?? "Не удалось загрузить клиентов"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [repository]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter(client => {
      const matchesStatus = status === "all" || client.status === status;
      const haystack = [client.first_name, client.last_name, client.telegram_username, client.goal]
        .filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && (!q || haystack.includes(q));
    });
  }, [clients, query, status]);

  if (loading) return <div role="status">Загрузка клиентов…</div>;
  if (error) return <div role="alert">{error}</div>;

  return (
    <section aria-label="Клиенты">
      <header>
        <h1>Клиенты</h1>
        <span>{clients.length}</span>
      </header>

      <div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по имени, @username или цели"
          aria-label="Поиск клиентов"
        />
        <select value={status} onChange={e => setStatus(e.target.value as typeof status)} aria-label="Статус">
          <option value="all">Все</option>
          <option value="lead">Лиды</option>
          <option value="active">Активные</option>
          <option value="paused">На паузе</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p>{clients.length === 0 ? "Клиентов пока нет." : "По этому фильтру клиентов нет."}</p>
      ) : (
        <div>
          {filtered.map(client => (
            <button key={client.id} type="button" onClick={() => onOpenClient(client)}>
              <strong>{[client.first_name, client.last_name].filter(Boolean).join(" ")}</strong>
              {client.telegram_username && <span> @{client.telegram_username}</span>}
              <small>{client.goal || "Цель не указана"} · {client.sessions_remaining} тренировок осталось</small>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
