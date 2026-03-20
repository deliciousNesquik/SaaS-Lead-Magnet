// ============================================================
// AUTH SERVICE — Реальные HTTP запросы к Express backend
// Все запросы идут через Vite proxy: /api → http://localhost:3001/api
// ============================================================
import { api, setJwtToken, getJwtToken } from "./api";
import type { User } from "@/types/auth";
// ── Типы ответов backend ────────────────────────────────────────
interface RegisterResponse {
  token: string;
  tgLink: string;
  expiresAt: string;
  message: string;
}
interface LoginResponse {
  token: string;
  tgLink: string;
  expiresAt: string;
  userName: string;
  message: string;
}
interface StatusResponse {
  status: "pending" | "confirmed" | "expired" | "used" | "not_found";
  confirmed: boolean;
}
interface SessionResponse {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    name: string;
    phone: string;
    tgId: string | null;
    plan: string;
    planExpires: string | null;
  };
}
interface MeResponse {
  id: string;
  name: string;
  phone: string;
  tgId: string | null;
  tgUsername: string | null;
  plan: string;
  planExpires: string | null;
  createdAt: string;
}
// ── Конвертер: backend user → frontend User ─────────────────────
function toUser(raw: MeResponse | SessionResponse["user"]): User {
  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone,
    tgId: raw.tgId,
    registeredAt: ("createdAt" in raw ? raw.createdAt : undefined) ?? new Date().toISOString(),
  };
}
// ============================================================
// POST /api/auth/register
// Шаг 1 регистрации: отправляем имя + телефон
// Backend создаёт auth_session, возвращает token и TG ссылку
// ============================================================
export async function registerStart(
    name: string,
    phone: string
): Promise<{ token: string; tgLink: string }> {
  const data = await api.post<RegisterResponse>("/auth/register", {
    name,
    phone,
  });
  return {
    token: data.token,
    tgLink: data.tgLink,
  };
}
// ============================================================
// POST /api/auth/login
// Шаг 1 входа: отправляем телефон
// Backend проверяет что пользователь существует, создаёт сессию
// ============================================================
export async function loginStart(
    phone: string
): Promise<{ token: string; tgLink: string; userName: string }> {
  const data = await api.post<LoginResponse>("/auth/login", { phone });
  return {
    token: data.token,
    tgLink: data.tgLink,
    userName: data.userName,
  };
}
// ============================================================
// GET /api/auth/status/:token
// Поллинг — вызываем каждые 2 сек. пока пользователь в TG
//
// Флоу:
//   фронт поллит → backend смотрит в auth_sessions
//   Telegram Bot вызвал PATCH /api/auth/confirm/:token
//   → статус стал 'confirmed' → мы получаем его здесь
// ============================================================
export async function checkAuthStatus(
    token: string
): Promise<{ status: "pending" | "confirmed" | "expired" }> {
  const data = await api.get<StatusResponse>(`/auth/status/${token}`);
  // Нормализуем статусы
  if (data.status === "confirmed" || data.confirmed) {
    return { status: "confirmed" };
  }
  if (
      data.status === "expired" ||
      data.status === "not_found" ||
      data.status === "used"
  ) {
    return { status: "expired" };
  }
  return { status: "pending" };
}
// ============================================================
// POST /api/auth/session/:token
// После того как поллинг вернул 'confirmed':
//   - Backend генерирует JWT
//   - Устанавливает httpOnly cookie
//   - Возвращает данные пользователя
// ============================================================
export async function getSessionUser(token: string): Promise<User> {
  const data = await api.post<SessionResponse>(`/auth/session/${token}`);
  // Сохраняем JWT для последующих запросов
  setJwtToken(data.token);
  return toUser(data.user);
}
// ============================================================
// GET /api/auth/me
// Восстановление сессии при перезагрузке страницы
// Работает если:
//   - Есть JWT в sessionStorage (мы его туда кладём)
//   - Есть httpOnly cookie auth_token (выста��ляется сервером)
// ============================================================
export async function getCurrentUser(): Promise<User | null> {
  // Проверяем есть ли JWT вообще
  const hasToken = getJwtToken() !== null;
  // Если нет токена и нет cookie — точно не авторизован
  // Но всё равно делаем запрос т.к. cookie httpOnly не видна JS
  try {
    const data = await api.get<MeResponse>("/auth/me");
    return toUser(data);
  } catch (err) {
    const error = err as { status?: number };
    // 401 — не авторизован, это нормально при первом входе
    if (error.status === 401) {
      if (hasToken) setJwtToken(null); // токен невалидный, очищаем
      return null;
    }
    // Сеть недоступна или backend не запущен — не падаем
    console.warn("Backend недоступен, продолжаем в offline режиме");
    return null;
  }
}
// ============================================================
// POST /api/auth/logout
// Отзываем JWT (добавляем в blacklist на сервере)
// Очищаем локальное хранение
// ============================================================
export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Игнорируем ошибки при логауте (токен мог уже истечь)
  } finally {
    setJwtToken(null);
  }
}
// ── Утилита для отладки ────────────────────────────────────────
export const __debug = {
  getToken: getJwtToken,
  clearToken: () => setJwtToken(null),
};