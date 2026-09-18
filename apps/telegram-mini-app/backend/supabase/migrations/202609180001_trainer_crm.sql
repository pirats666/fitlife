-- Trainer CRM schema: clients, programs, nutrition, measurements, payments, notes.
create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique,
  telegram_username text,
  first_name text not null,
  last_name text,
  phone text,
  status text not null default 'active' check (status in ('lead','active','paused','archived')),
  goal text,
  goal_details text,
  training_experience text,
  age smallint check (age is null or age between 13 and 120),
  training_location text,
  equipment text[] not null default '{}',
  training_days_per_week smallint check (training_days_per_week is null or training_days_per_week between 1 and 14),
  session_duration_minutes smallint,
  movement_limitations text,
  recovery_notes text,
  coach_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_programs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  goal text,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft','active','completed','archived')),
  starts_on date,
  ends_on date,
  rationale text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  day_number smallint not null,
  title text not null,
  notes text,
  unique(program_id, day_number)
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.workout_days(id) on delete cascade,
  exercise_id text,
  exercise_name text not null,
  sort_order smallint not null default 0,
  sets smallint,
  reps text,
  working_weight numeric,
  rest_seconds integer,
  tempo text,
  rpe numeric(4,1),
  rir numeric(4,1),
  coach_comment text,
  media_url text
);

create table if not exists public.training_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  workout_day_id uuid references public.workout_days(id) on delete set null,
  performed_at timestamptz not null default now(),
  duration_minutes smallint,
  rpe numeric(4,1),
  notes text
);

create table if not exists public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  goal text,
  calories numeric,
  protein_g numeric,
  fat_g numeric,
  carbs_g numeric,
  instructions text,
  version integer not null default 1,
  status text not null default 'active' check (status in ('draft','active','completed','archived')),
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now()
);

create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  measured_on date not null default current_date,
  body_weight_kg numeric(6,2),
  chest_cm numeric(6,2),
  waist_cm numeric(6,2),
  hips_cm numeric(6,2),
  arm_cm numeric(6,2),
  thigh_cm numeric(6,2),
  body_fat_percent numeric(5,2),
  other jsonb not null default '{}',
  photo_urls text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_records (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  paid_at timestamptz not null default now(),
  amount numeric(12,2) not null,
  currency text not null default 'RUB',
  package_name text,
  sessions_purchased integer,
  sessions_used integer not null default 0,
  valid_from date,
  valid_until date,
  status text not null default 'active' check (status in ('pending','active','expired','cancelled')),
  comment text
);

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_clients_status on public.clients(status);
create index if not exists idx_programs_client on public.training_programs(client_id);
create index if not exists idx_nutrition_client on public.nutrition_plans(client_id);
create index if not exists idx_measurements_client_date on public.measurements(client_id, measured_on desc);
create index if not exists idx_payments_client_date on public.payment_records(client_id, paid_at desc);
create index if not exists idx_training_logs_client_date on public.training_logs(client_id, performed_at desc);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

-- RLS is enabled now; backend/service role can manage records.
-- Public/client-facing access should be added only with explicit policies later.
alter table public.clients enable row level security;
alter table public.training_programs enable row level security;
alter table public.workout_days enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.training_logs enable row level security;
alter table public.nutrition_plans enable row level security;
alter table public.measurements enable row level security;
alter table public.payment_records enable row level security;
alter table public.client_notes enable row level security;
