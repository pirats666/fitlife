create table if not exists public.exercise_performance_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  workout_exercise_id uuid references public.workout_exercises(id) on delete set null,
  exercise_name text not null,
  performed_at timestamptz not null default now(),
  sets integer,
  reps integer,
  weight_kg numeric(7,2),
  estimated_1rm_kg numeric(7,2),
  notes text
);

create index if not exists idx_exercise_performance_client_date
  on public.exercise_performance_logs(client_id, exercise_name, performed_at desc);

alter table public.exercise_performance_logs enable row level security;
