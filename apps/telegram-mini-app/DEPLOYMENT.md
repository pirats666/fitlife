# FitLife Telegram Mini App — deployment

## Components

- `webapp/` — static HTTPS site for Telegram Mini App.
- `backend/` — Fastify API, Node.js.
- `bot/` — Telegram bot using long polling.

## Required production environment

Backend:

```env
TELEGRAM_BOT_TOKEN=
TRAINER_TELEGRAM_IDS=
PORT=3000
HOST=0.0.0.0
```

Bot:

```env
TELEGRAM_BOT_TOKEN=
FITLIFE_WEBAPP_URL=https://YOUR-WEBAPP-DOMAIN/
```

## Launch order

1. Deploy the webapp to an HTTPS domain.
2. Deploy the backend and set backend environment variables.
3. Set `FITLIFE_API_BASE` in the webapp if the API is hosted on a different origin. If both are served from one origin, leave it empty.
4. Deploy the bot as a persistent Node.js process and set its environment variables.
5. In BotFather, configure the bot's Mini App/menu button URL to the HTTPS webapp URL.
6. Open the bot in Telegram and test `/start`.

## MVP smoke test

- Telegram authentication succeeds.
- Client can select a goal.
- Workouts load.
- Current-day schedule loads.
- Workout completion is saved.
- Progress loads.
- Trainer can open the client area when their Telegram ID is listed in `TRAINER_TELEGRAM_IDS`.
- Trainer can assign a client and edit the weekly workout schedule.

## Important limitation

The current backend store is in-memory. User profiles, assignments, schedules and workout history reset when the backend process restarts. Before a public launch, replace the in-memory store with PostgreSQL/Supabase persistence.
