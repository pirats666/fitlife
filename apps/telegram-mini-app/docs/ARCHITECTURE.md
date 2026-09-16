# FitLife MVP — Architecture

## Components

- `webapp/` — Telegram Mini App UI. Mobile-first, plain HTML/CSS/JS.
- `backend/` — Fastify API, Telegram init-data validation and business rules.
- `bot/` — Telegram Bot API long-polling launcher for opening the Mini App.
- `shared/` — shared domain contracts.

## User flow

1. User opens the bot and taps **Открыть FitLife**.
2. Telegram provides WebApp `initData` to the Mini App.
3. The backend validates `initData` with the bot token before protected operations.
4. The user is created/updated in the application store.
5. The UI loads workouts and the user's schedule.
6. A client can complete workouts and view progress.
7. A configured trainer can manage assigned clients and their weekly programs.

## Roles

`TRAINER_TELEGRAM_IDS` defines trainer Telegram IDs. All trainer routes verify that the authenticated Telegram user matches the trainer ID in the route/query.

## Current storage

The MVP uses in-memory Maps. This is intentional for the first functional slice, but it means users, assignments, workout history and client schedules are lost when the backend restarts.

## Production migration

Before public launch, replace the in-memory store with PostgreSQL/Supabase behind a repository interface. Persist at least:

- users
- trainer-client assignments
- workout history
- client weekly schedules
- future custom workout/program entities

Do not put Telegram bot tokens or database credentials into source control.
