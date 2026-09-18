-- Automated follow-up state for the Pavel Fitness marketing funnel.
alter table public.quiz_results
  add column if not exists followup_eligible_at timestamptz,
  add column if not exists followup_1_sent_at timestamptz,
  add column if not exists followup_2_sent_at timestamptz;

create index if not exists quiz_results_followup_eligible_idx
  on public.quiz_results (followup_eligible_at)
  where followup_eligible_at is not null;
