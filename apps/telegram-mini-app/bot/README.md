# FitLife Telegram Bot

Минимальный Telegram-бот для запуска FitLife Mini App.

## Команды

- `/start` — приветствие и кнопка открытия FitLife
- `/help` — краткая справка
- `/profile` — повторно открыть FitLife

Bot token хранится только в переменных окружения. Секреты не коммитятся в репозиторий.

## Переменные окружения

```env
TELEGRAM_BOT_TOKEN=
FITLIFE_WEBAPP_URL=https://your-domain.example/telegram-mini-app/
```

В production `FITLIFE_WEBAPP_URL` должен указывать на HTTPS-адрес опубликованного Mini App.

## Запуск

```bash
npm install
npm run dev
```

Бот использует long polling и не требует отдельного webhook-сервера.
