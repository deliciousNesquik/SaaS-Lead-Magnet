# 🛡 ОхранаТруда.PRO — Backend
Express + SQLite + Telegram Bot
---
## 🚀 Быстрый старт
```bash
cd backend
# 1. Установить зависимости
npm install
# 2. Настроить окружение
cp .env.example .env
# Отредактируйте .env — укажите TELEGRAM_BOT_TOKEN и другие ключи
# 3. Запустить сервер (dev режим с hot-reload)
npm run dev
# 4. В другом терминале — запустить бота
npm run dev:bot
```
Сервер запустится на **http://localhost:3001**
---
## 🔐 Полный флоу авторизации
```
РЕГИСТРАЦИЯ:
═══════════
  Браузер                      Express                    Telegram Bot
     │                            │                             │
     │  POST /api/auth/register   │                             │
     │  { name, phone }           │                             │
     │──────────────────────────►│                             │
     │                            │  Создаём auth_session       │
     │                            │  status: 'pending'          │
     │                            │  token: "A1B2C3..."         │
     │  { token, tgLink }         │                             │
     │◄──────────────────────────│                             │
     │                            │                             │
     │  Показываем ссылку:        │                             │
     │  t.me/bot?start=A1B2C3     │                             │
     │                            │                             │
     │  Пользователь переходит ───────────────────────────────►│
     │  в Telegram бот            │                             │
     │                            │                             │
     │  Бот получает /start A1B2C3│                             │
     │                            │  PATCH /api/auth/confirm    │
     │                            │◄────────────────────────────│
     │                            │  { tg_id, tg_username }     │
     │                            │                             │
     │                            │  Создаём User в БД          │
     │                            │  session.status = confirmed │
     │                            │                             │
     │                            │  { success, mode, user } ──►│
     │                            │                             │  Бот пишет:
     │                            │                             │  "✅ Регистрация успешна!"
     │                            │                             │  + уведомление менеджеру
     │                            │                             │
     │  GET /api/auth/status      │                             │
     │  (каждые 2 сек, поллинг)  │                             │
     │──────────────────────────►│                             │
     │  { status: 'confirmed' }   │                             │
     │◄──────────────────────────│                             │
     │                            │                             │
     │  POST /api/auth/session    │                             │
     │  { token }                 │                             │
     │──────────────────────────►│                             │
     │                            │  Генерируем JWT             │
     │  { jwt, user }             │  Помечаем сессию 'used'     │
     │◄──────────────────────────│                             │
     │                            │                             │
     │  Сохраняем JWT             │                             │
     │  Пользователь залогинен! ✅│                             │
ПОВТОРНЫЙ ВХОД:
═══════════════
  1. POST /api/auth/login { phone }
     → Проверяем что user существует
     → Создаём session mode='login', user_id уже заполнен
     → Возвращаем tgLink
  2. (Тот же флоу через бота)
     → Бот вызывает PATCH /api/auth/confirm/TOKEN
     → confirmSession() НЕ создаёт user, а находит по phone
     → session.status = confirmed
  3. POST /api/auth/session/:token → JWT
СХЕМА БАЗЫ ДАННЫХ:
══════════════════
  users
  ├── id (TEXT PK)
  ├── name (TEXT)
  ├── phone (TEXT UNIQUE)      ← +7XXXXXXXXXX
  ├── tg_id (TEXT UNIQUE)      ← Telegram user ID
  ├── tg_username (TEXT)       ← @username
  ├── plan (TEXT)              ← free|starter|business|enterprise
  └── plan_expires (TEXT)      ← ISO дата
  auth_sessions
  ├── token (TEXT PK)          ← /start параметр в боте
  ├── user_id → users.id       ← NULL до подтверждения (при register)
  ├── phone (TEXT)
  ├── name (TEXT)
  ├── mode (TEXT)              ← register|login
  ├── status (TEXT)            ← pending|confirmed|expired|used
  ├── created_at, expires_at   ← токен живёт 10 минут
  └── confirmed_tg_id          ← tg_id который подтвердил
  download_logs                ← АНАЛИТИКА
  ├── user_id → users.id
  ├── document_id → documents.id
  ├── document_name
  ├── downloaded_at
  ├── ip_address
  └── user_agent
  favorites
  └── PK(user_id, document_id)
  search_history
  ├── user_id → users.id
  ├── query
  └── results_count            ← 0 = не нашли → добавить документ!
```
---
## 📁 Структура
```
backend/
  src/
    config/
      env.ts                   ← Все переменные окружения
    database/
      connectors/
        sqlite.ts              ← Подключение + миграции
      repositories/
        auth.repository.ts     ← users, auth_sessions
        documents.repository.ts← documents, download_logs, favorites
        search.repository.ts   ← search_history
    middleware/
      authMiddleware.ts        ← JWT проверка, requireAuth, optionalAuth
    routes/
      auth.ts                  ← /api/auth/* (регистрация, вход, поллинг)
      downloads.ts             ← /api/documents/* (список, скачивание)
    bot/
      telegram.ts              ← Telegram Bot (отдельный процесс)
      notifications.ts         ← Уведомления менеджеру
    server.ts                  ← Точка входа Express
  storage/
    templates/                 ← Файлы документов (.docx, .xlsx, .pdf)
    database.sqlite            ← SQLite БД (создаётся автоматически)
  .env.example                 ← Шаблон конфигурации
  package.json
  tsconfig.json
```
---
## 🔑 Переменные окружения
| Переменная | Описание | Пример |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Токен от @BotFather | `1234567890:AAF...` |
| `TELEGRAM_MANAGER_CHAT_ID` | Ваш Telegram ID (узнать: @userinfobot) | `123456789` |
| `JWT_SECRET` | Случайная строка 64+ символа | `openssl rand -hex 64` |
| `DATABASE_PATH` | Путь к SQLite файлу | `./storage/database.sqlite` |
| `TEMPLATES_DIR` | Папка с документами | `./storage/templates` |
| `BOT_WEBHOOK_SECRET` | Секрет между ботом и сервером | любая строка |
---
## 📄 Добавление документов
1. Положите файл в `backend/storage/templates/`
2. Добавьте запись в таблицу `documents` (через SQLite или API)
```sql
INSERT INTO documents (id, title, category, type, description, filename, tags, is_free, pages, updated_at)
VALUES (
  'doc_007',
  'Журнал учёта выдачи СИЗ',
  'Журналы',
  'Журнал',
  'Форма журнала для учёта выдачи средств индивидуальной защиты',
  'zhurnal-siz.xlsx',    -- имя файла в storage/templates/
  '["СИЗ","выдача","учёт"]',
  0,                     -- 0 = Pro, 1 = бесплатный
  2,
  datetime('now')
);
```
---
## 🤖 Получение Bot Token
1. Откройте `@BotFather` в Telegram
2. Напишите `/newbot`
3. Укажите название и username (например `@OhranaTrudoBot`)
4. Скопируйте токен в `.env` → `TELEGRAM_BOT_TOKEN`
---
## 📊 API эндпоинты
```
POST   /api/auth/register        Начать регистрацию
POST   /api/auth/login           Начать вход
GET    /api/auth/status/:token   Поллинг статуса
POST   /api/auth/session/:token  Получить JWT
PATCH  /api/auth/confirm/:token  Подтверждение от бота (внутренний)
POST   /api/auth/logout          Выход
GET    /api/auth/me              Текущий пользователь
GET    /api/documents            Список документов
GET    /api/documents/search     Поиск
GET    /api/documents/:id        Один документ
GET    /api/documents/:id/download  Скачать файл ← ГЛАВНЫЙ
GET    /api/documents/favorites  Избранное
POST   /api/documents/:id/favorite  Добавить в избранное
GET    /api/documents/history    История скачиваний
GET    /health                   Healthcheck
```
