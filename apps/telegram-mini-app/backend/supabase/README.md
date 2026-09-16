# FitLife Supabase

Эта папка содержит SQL-схему постоянного хранения FitLife.

## Что хранится

- `users` — Telegram-профили, роль, цель и onboarding.
- `workout_history` — завершённые тренировки.
- `trainer_clients` — связь тренер → клиент.
- `client_schedules` — персональное расписание клиента по дням недели.

## Важный принцип безопасности

Backend должен подключаться к Supabase с **service role key**, который хранится только в secrets переменных окружения backend. Этот ключ нельзя помещать в `webapp/`, Telegram Mini App или Git.

RLS включён на таблицах, чтобы данные не были случайно доступны через публичный Supabase API.

## Следующий шаг

После применения `migrations/001_initial.sql` backend store будет переведён с временных `Map` на Supabase. До этого текущая версия приложения продолжает работать на in-memory store.
