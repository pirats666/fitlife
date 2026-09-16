# FitLife MVP API

Base URL is the backend origin.

## Public

- `GET /health`
- `GET /api/workouts`
- `GET /api/workouts/:workoutId`
- `GET /api/schedule`

## Telegram authentication

`POST /api/auth/telegram`

Body:

```json
{ "initData": "<Telegram WebApp initData>" }
```

## Client

Protected routes require the `x-telegram-init-data` header.

- `GET /api/users/:telegramId`
- `PATCH /api/users/:telegramId`
- `GET /api/users/:telegramId/schedule`
- `GET /api/users/:telegramId/progress`
- `GET /api/users/:telegramId/workouts/history`
- `POST /api/users/:telegramId/workouts/:workoutId/complete`
- `GET /api/users/:clientId/trainer`

The authenticated Telegram ID must match the route user ID.

## Trainer

Trainer routes additionally require the authenticated Telegram user to be configured in `TRAINER_TELEGRAM_IDS` and to match the trainer ID in the request.

- `GET /api/trainer/clients?trainerId=:trainerId`
- `POST /api/trainer/clients/assign`
- `GET /api/trainer/:trainerId/clients/:clientId/progress`
- `GET /api/trainer/:trainerId/clients/:clientId/schedule`
- `PUT /api/trainer/:trainerId/clients/:clientId/schedule`

Schedule body:

```json
{
  "schedule": [
    { "day": 1, "workoutId": "open-workout-1" },
    { "day": 2, "workoutId": null }
  ]
}
```

Unknown workout IDs are rejected. The trainer must already be assigned to the client.
