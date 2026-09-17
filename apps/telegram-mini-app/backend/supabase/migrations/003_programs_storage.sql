-- Creates the storage bucket used by the Telegram quiz program PDFs.
-- The binary PDF objects still need to be uploaded to Supabase Storage.
insert into storage.buckets (id, name, public)
values ('programs', 'programs', true)
on conflict (id) do update set public = excluded.public;

-- Public object URLs follow:
-- https://<PROJECT_REF>.supabase.co/storage/v1/object/public/programs/<FILE_NAME>
-- After uploading the four PDFs, set programs.pdf_url to those URLs.

update public.programs set pdf_url = 'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/programs/FULL_BODY_%D0%9C%D0%B8%D0%BA%D1%80%D0%BE%D1%86%D0%B8%D0%BA_%D0%B4%D0%BB%D1%8F_%D0%BD%D0%BE%D0%B2%D0%B8%D1%87%D0%BA%D0%B0.pdf' where slug = 'full_body_beginner';
update public.programs set pdf_url = 'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/programs/FULL_BODY_HOME.pdf' where slug = 'full_body_home';
update public.programs set pdf_url = 'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/programs/OUTDOOR_FULL_BODY.pdf' where slug = 'outdoor_full_body';
update public.programs set pdf_url = 'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/programs/3-DAY_SPLIT.pdf' where slug = 'three_day_split';
