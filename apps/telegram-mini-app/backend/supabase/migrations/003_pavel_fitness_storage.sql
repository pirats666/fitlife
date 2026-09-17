-- Pavel Fitness program PDFs in Supabase Storage.
-- Upload the four files to the public `programs` bucket using these exact paths.

insert into storage.buckets (id, name, public)
values ('programs', 'programs', true)
on conflict (id) do update set public = true;

create policy "Public can read Pavel Fitness programs"
on storage.objects for select
to public
using (bucket_id = 'programs');

alter table public.programs
  add column if not exists storage_path text;

update public.programs
set storage_path = case slug
  when 'full_body_beginner' then 'FULL_BODY_Микроцикл_для_новичка.pdf'
  when 'full_body_home' then 'FULL_BODY_HOME.pdf'
  when 'outdoor_full_body' then 'OUTDOOR_FULL_BODY.pdf'
  when 'three_day_split' then '3-DAY_SPLIT.pdf'
end
where storage_path is null;
