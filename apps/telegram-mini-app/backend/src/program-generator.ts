export type ClientProfile = {
  first_name: string;
  goal?: string | null;
  goal_details?: string | null;
  training_experience?: string | null;
  training_location?: string | null;
  equipment?: string[] | null;
  training_days_per_week?: number | null;
  session_duration_minutes?: number | null;
  movement_limitations?: string | null;
};

export type ProgramDraft = {
  name: string;
  goal: string | null;
  rationale: string;
  days: Array<{
    day_number: number;
    title: string;
    notes: string;
    exercises: Array<{
      exercise_name: string;
      sets: number;
      reps: string;
      rest_seconds: number;
      coach_comment: string;
    }>;
  }>;
};

const templates = [
  { name: "Приседание с собственным весом", tags: ["home","street","gym"], focus: "legs" },
  { name: "Отжимания", tags: ["home","street","gym"], focus: "chest" },
  { name: "Тяга верхнего блока", tags: ["gym"], focus: "back" },
  { name: "Good Morning без веса", tags: ["home","street","gym"], focus: "back" },
  { name: "Выпады назад", tags: ["home","street","gym"], focus: "legs" },
  { name: "Жим гантелей лёжа", tags: ["gym","home"], focus: "chest" },
  { name: "Тяга гантели в наклоне", tags: ["gym","home"], focus: "back" },
  { name: "Жим гантелей вверх", tags: ["gym","home"], focus: "shoulders" },
  { name: "Ягодичный мост", tags: ["home","gym"], focus: "glutes" },
  { name: "Dead Bug", tags: ["home","street","gym"], focus: "core" },
  { name: "Ходьба быстрым темпом", tags: ["home","street","gym"], focus: "cardio" }
] as const;

function locationKey(location?: string | null) {
  const value = (location ?? "").toLowerCase();
  if (value.includes("зал") || value.includes("gym")) return "gym";
  if (value.includes("дом")) return "home";
  if (value.includes("улиц") || value.includes("street")) return "street";
  return "home";
}

function exercisesFor(profile: ClientProfile) {
  const loc = locationKey(profile.training_location);
  const allowed = templates.filter(e => e.tags.includes(loc as never));
  const byFocus = (focus: string) => allowed.find(e => e.focus === focus)?.name;
  return ["legs","chest","back","shoulders","core"].map(byFocus).filter(Boolean) as string[];
}

export function generateProgramDraft(profile: ClientProfile): ProgramDraft {
  const daysCount = Math.min(6, Math.max(1, Number(profile.training_days_per_week) || 3));
  const beginner = (profile.training_experience ?? "").toLowerCase().includes("нович");
  const sets = beginner ? 2 : 3;
  const reps = beginner ? "8-12" : "8-15";
  const rest = beginner ? 90 : 90;
  const base = exercisesFor(profile);
  const days = Array.from({ length: daysCount }, (_, i) => ({
    day_number: i + 1,
    title: `Тренировка ${i + 1} — Full Body`,
    notes: "Черновик: тренер должен проверить технику, ограничения и объём перед назначением клиенту.",
    exercises: base.map(name => ({
      exercise_name: name,
      sets,
      reps,
      rest_seconds: rest,
      coach_comment: "Подобрать вариант упражнения под технику и доступное оборудование."
    }))
  }));

  return {
    name: `Программа для ${profile.first_name}`,
    goal: profile.goal ?? null,
    rationale: [
      profile.goal ? `Цель: ${profile.goal}.` : "Цель не указана.",
      profile.training_experience ? `Опыт: ${profile.training_experience}.` : "",
      profile.training_location ? `Место: ${profile.training_location}.` : "",
      profile.training_days_per_week ? `Частота: ${profile.training_days_per_week} раз/неделю.` : "",
      profile.session_duration_minutes ? `Длительность: около ${profile.session_duration_minutes} минут.` : ""
    ].filter(Boolean).join(" "),
    days
  };
}
