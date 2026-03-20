// ============================================================
// AUTH TYPES
// ============================================================

export type AuthStatus = "idle" | "pending" | "confirmed" | "expired";
export type ModalMode = "register" | "login";
export type ModalStep = "form" | "waiting" | "success";

export interface User {
  id: string;
  name: string;
  phone: string;
  tgId: string | null;
  registeredAt: string;
}

export interface AuthSession {
  token: string;
  userId: string | null;
  phone: string;
  name: string;
  mode: ModalMode;
  status: AuthStatus;
  createdAt: string;
  expiresAt: string;
  confirmedAt: string | null;
}

// ============================================================
// MOCK DB — Имитирует SQLite таблицы в localStorage
// Схема реальной БД:
//
// TABLE users (
//   id         TEXT PRIMARY KEY,
//   name       TEXT NOT NULL,
//   phone      TEXT UNIQUE NOT NULL,
//   tg_id      TEXT UNIQUE,
//   created_at TEXT NOT NULL
// )
//
// TABLE auth_sessions (
//   token        TEXT PRIMARY KEY,       -- уникальный токен /start=TOKEN в боте
//   user_id      TEXT REFERENCES users,  -- NULL до подтверждения
//   phone        TEXT NOT NULL,          -- для поиска при логине
//   name         TEXT NOT NULL,
//   mode         TEXT NOT NULL,          -- 'register' | 'login'
//   status       TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | expired
//   created_at   TEXT NOT NULL,
//   expires_at   TEXT NOT NULL,          -- токен живёт 10 минут
//   confirmed_at TEXT                    -- заполняется ботом
// )
//
// ============================================================
// ПОТОК РЕГИСТРАЦИИ:
//   1. POST /auth/register { name, phone }
//      → создаётся auth_session со статусом 'pending', возвращается token
//   2. Пользователь переходит в бот по ссылке https://t.me/bot?start=TOKEN
//   3. Бот вызывает PATCH /auth/confirm/:token { tg_id }
//      → создаётся user, сессия переходит в 'confirmed', bot_id сохраняется
//   4. Фронт поллит GET /auth/status/:token каждые 2 сек
//      → получив 'confirmed', запрашивает GET /auth/session/:token
//      → сервер выдаёт JWT, фронт сохраняет в httpOnly cookie + localStorage
//
// ПОТОК ВХОДА (повторный):
//   1. POST /auth/login { phone }
//      → проверяем что user с таким phone существует
//      → создаётся новая auth_session mode='login'
//   2. Тот же флоу через бота
//   3. При подтверждении бот не создаёт user, а ищет по phone → выдаёт JWT
// ============================================================
