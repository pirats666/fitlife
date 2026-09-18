import React, { useState } from "react";
import { TrainingProgramBuilder } from "./TrainingProgramBuilder";

type Props = { clientId: string; apiBaseUrl?: string; initData?: string };

export function GenerateProgramButton({ clientId, apiBaseUrl = "", initData = "" }: Props) {
  const [draft, setDraft] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/trainer/crm/clients/${clientId}/programs/generate`, {
        headers: initData ? { "x-telegram-init-data": initData } : {}
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось создать черновик");
      setDraft(result.draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать черновик");
    } finally { setLoading(false); }
  }

  if (draft) return <TrainingProgramBuilder
    clientId={clientId}
    apiBaseUrl={apiBaseUrl}
    initData={initData}
    onCreated={() => setDraft(null)}
  />;

  return <div>
    {error && <p role="alert">{error}</p>}
    <button type="button" onClick={generate} disabled={loading}>
      {loading ? "Готовим черновик…" : "✨ Сгенерировать программу"}
    </button>
  </div>;
}
