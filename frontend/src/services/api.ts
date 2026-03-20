// ============================================================
// API CLIENT — Базовый HTTP клиент для запросов к backend
// Все запросы идут через Vite proxy → http://localhost:3001
// ============================================================
const BASE_URL = "/api";
// ── Типы ────────────────────────────────────────────────────────
export interface ApiError {
    code: string;
    message: string;
    status: number;
}
// JWT хранится в памяти (более безопасно чем localStorage)
// При перезагрузке восстанавливается через httpOnly cookie или /api/auth/me
let _jwtToken: string | null = null;
export function setJwtToken(token: string | null) {
    _jwtToken = token;
    if (token) {
        sessionStorage.setItem("ot_jwt", token);
    } else {
        sessionStorage.removeItem("ot_jwt");
    }
}
export function getJwtToken(): string | null {
    if (_jwtToken) return _jwtToken;
    // Восстанавливаем из sessionStorage при перезагрузке
    const stored = sessionStorage.getItem("ot_jwt");
    if (stored) {
        _jwtToken = stored;
        return stored;
    }
    return null;
}
// ── Базовый fetch ─────────────────────────────────────────────
interface FetchOptions extends RequestInit {
    skipAuth?: boolean;
}
export async function apiFetch<T>(
    path: string,
    options: FetchOptions = {}
): Promise<T> {
    const { skipAuth = false, ...init } = options;
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string>),
    };
    // Добавляем JWT токен если есть
    const token = getJwtToken();
    if (token && !skipAuth) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers,
        credentials: "include", // важно для httpOnly cookie
    });
    // Пустой ответ (например 204 No Content)
    if (response.status === 204) {
        return {} as T;
    }
    const data = await response.json();
    if (!response.ok) {
        const error: ApiError = {
            code: data.code || "UNKNOWN_ERROR",
            message: data.error || "Произошла ошибка",
            status: response.status,
        };
        throw error;
    }
    return data as T;
}
// ── Хелперы для GET/POST/PATCH/DELETE ─────────────────────────
export const api = {
    get: <T>(path: string, options?: FetchOptions) =>
        apiFetch<T>(path, { method: "GET", ...options }),
    post: <T>(path: string, body?: unknown, options?: FetchOptions) =>
        apiFetch<T>(path, {
            method: "POST",
            body: body ? JSON.stringify(body) : undefined,
            ...options,
        }),
    patch: <T>(path: string, body?: unknown, options?: FetchOptions) =>
        apiFetch<T>(path, {
            method: "PATCH",
            body: body ? JSON.stringify(body) : undefined,
            ...options,
        }),
    delete: <T>(path: string, options?: FetchOptions) =>
        apiFetch<T>(path, { method: "DELETE", ...options }),
};