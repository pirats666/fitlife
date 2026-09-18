import React, { useEffect, useState } from "react";
import { GenerateProgramButton } from "./GenerateProgramButton";

type Props = { clientId: string; apiBaseUrl?: string; initData?: string };

export function ClientPrograms({ clientId, apiBaseUrl = "", initData = "" }: Props) {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const response = await fetch(`${apiBaseUrl}/api/trainer/crm/clients/${clientId}/programs`, {
      headers: initData ? { "x-telegram-init-data": initData } : {}
    });
    const result = await response.json();
    setPrograms(result.programs ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [clientId]);

  async function changeStatus(programId: string, status: string) {
    await fetch(`${apiBaseUrl}/api/trainer/crm/clients/${clientId}/programs/${programId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(initData ? { "x-telegram-init-data": initData } : {}) },
      body: JSON.stringify({ status })
    });
    await load();
  }

  return <section aria-label="Программы клиента">
    <header><h2>Программы</h2><GenerateProgramButton clientId={clientId} apiBaseUrl={apiBaseUrl} initData={initData} /></header>
    {loading ? <p>Загрузка…</p> : programs.length === 0 ? <p>Программ пока нет.</p> : programs.map(program =>
      <article key={program.id}>
        <h3>{program.name} · v{program.version}</h3>
        <p>{program.goal || "Цель не указана"}</p>
        <p>{program.starts_on || "Дата начала не указана"} — {program.ends_on || "без даты окончания"}</p>
        <strong>{program.status}</strong>
        <div>
          {program.status !== "active" && <button type="button" onClick={() => changeStatus(program.id, "active")}>Сделать активной</button>}
          {program.status === "active" && <button type="button" onClick={() => changeStatus(program.id, "completed")}>Завершить</button>}
          {program.status !== "archived" && <button type="button" onClick={() => changeStatus(program.id, "archived")}>Архивировать</button>}
        </div>
      </article>
    )}
  </section>;
}
