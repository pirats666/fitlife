alter table public.quiz_results
  add column if not exists lead_status text not null default 'new';

alter table public.quiz_results
  drop constraint if exists quiz_results_lead_status_check;

alter table public.quiz_results
  add constraint quiz_results_lead_status_check
  check (lead_status in ('new', 'in_progress', 'closed', 'not_relevant'));

create index if not exists quiz_results_lead_status_idx
  on public.quiz_results (lead_status);