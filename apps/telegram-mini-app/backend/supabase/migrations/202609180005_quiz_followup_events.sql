alter table public.funnel_events drop constraint if exists funnel_events_event_name_check;

alter table public.funnel_events
  add constraint funnel_events_event_name_check
  check (event_name in (
    'START',
    'TEST_STARTED',
    'QUESTION_1',
    'QUESTION_2',
    'QUESTION_3',
    'TEST_COMPLETED',
    'RESULT_SHOWN',
    'PROGRAM_REQUESTED',
    'PROGRAM_DOWNLOADED',
    'TRAINER_CLICKED',
    'OFFER_SHOWN',
    'FOLLOWUP_1_SENT',
    'FOLLOWUP_2_SENT'
  ));
