# FitLife Telegram Mini App

Базовый каркас Telegram Mini App для фитнес-приложения FitLife.

## Архитектура

- `webapp/` — клиентская часть Mini App
- `bot/` — Telegram Bot handlers и команды
- `backend/` — API и бизнес-логика
- `shared/` — общие типы и контракты
- `docs/` — техническая документация

## MVP

1. Авторизация через Telegram WebApp
2. Главный экран
3. Тренировки
4. Расписание
5. Прогресс
6. Питание
7. Профиль
8. Связь с тренером

Каркас подготовлен так, чтобы UI, Telegram Bot и backend можно было развивать независимо.
