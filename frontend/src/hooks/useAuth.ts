// ============================================================
// useAuth — хук управления состоянием авторизации
// Работает с реальным backend через authService
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";
import type { User, AuthStatus, ModalMode } from "@/types/auth";
import {
  getCurrentUser,
  checkAuthStatus,
  getSessionUser,
  logout as logoutService,
} from "@/services/authService";
export interface AuthState {
  user: User | null;
  isLoading: boolean;         // загрузка при старте (восстановление сессии)
  isPolling: boolean;         // идёт ожидание подтверждения от TG
  pollStatus: AuthStatus;     // текущий статус поллинга
  activeToken: string | null; // токен текущей auth_session
  activeMode: ModalMode | null;
}
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isPolling: false,
    pollStatus: "idle",
    activeToken: null,
    activeMode: null,
  });
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ── Восстановление сессии при старте ────────────────────────
  // GET /api/auth/me — проверяем httpOnly cookie или JWT из sessionStorage
  useEffect(() => {
    getCurrentUser()
        .then((user) => {
          setState((s) => ({ ...s, user, isLoading: false }));
        })
        .catch(() => {
          setState((s) => ({ ...s, isLoading: false }));
        });
  }, []);
  // ── Очищаем поллинг при размонтировании ─────────────────────
  useEffect(() => {
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);
  // ============================================================
  // startPolling — запускает опрос GET /api/auth/status/:token
  //
  // Флоу (реальный backend):
  //   1. Пользователь перешёл по TG ссылке t.me/bot?start=TOKEN
  //   2. Telegram Bot получил /start TOKEN
  //   3. Бот сделал PATCH /api/auth/confirm/TOKEN на сервер
  //   4. Сервер обновил auth_session.status = 'confirmed'
  //   5. Наш поллинг каждые 2 сек. спрашивает GET /api/auth/status/TOKEN
  //   6. Получаем status='confirmed' → вызываем POST /api/auth/session/TOKEN
  //   7. Сервер выдаёт JWT → сохраняем → пользователь авторизован ✅
  // ============================================================
  const startPolling = useCallback(
      (token: string, mode: ModalMode) => {
        stopPolling();
        setState((s) => ({
          ...s,
          isPolling: true,
          pollStatus: "pending",
          activeToken: token,
          activeMode: mode,
        }));
        // Поллим GET /api/auth/status/:token каждые 2 секунды
        pollIntervalRef.current = setInterval(async () => {
          try {
            const { status } = await checkAuthStatus(token);
            if (status === "confirmed") {
              stopPolling();
              // Обмениваем токен на JWT → получаем данные пользователя
              // POST /api/auth/session/:token
              const user = await getSessionUser(token);
              setState((s) => ({
                ...s,
                user,
                isPolling: false,
                pollStatus: "confirmed",
                activeToken: null,
                activeMode: null,
              }));
            } else if (status === "expired") {
              stopPolling();
              setState((s) => ({
                ...s,
                isPolling: false,
                pollStatus: "expired",
                activeToken: null,
                activeMode: null,
              }));
            }
            // status === "pending" → ничего не делаем, продолжаем поллинг
          } catch (err) {
            console.error("Polling error:", err);
            // Не останавливаем поллинг при сетевых ошибках — backend мог временно недоступен
          }
        }, 2000);
      },
      [stopPolling]
  );
  // ── Сброс статуса поллинга ───────────────────────────────────
  const resetPollStatus = useCallback(() => {
    stopPolling();
    setState((s) => ({
      ...s,
      isPolling: false,
      pollStatus: "idle",
      activeToken: null,
      activeMode: null,
    }));
  }, [stopPolling]);
  // ── Выход из аккаунта ────────────────────────────────────────
  // POST /api/auth/logout → JWT попадает в blacklist
  const logout = useCallback(async () => {
    stopPolling();
    await logoutService();
    setState((s) => ({
      ...s,
      user: null,
      isPolling: false,
      pollStatus: "idle",
      activeToken: null,
      activeMode: null,
    }));
  }, [stopPolling]);
  return {
    ...state,
    startPolling,
    resetPollStatus,
    logout,
  };
}