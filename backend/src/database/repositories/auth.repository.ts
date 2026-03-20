// ============================================================
// AUTH REPOSITORY — users + auth_sessions
// Использует sql.js через хелперы prepare/transaction из sqlite.ts
// ============================================================
import crypto from "crypto";
import { prepare, transaction } from "../connectors/sqlite";
import { config } from "../../config/env";
// ── Типы ────────────────────────────────────────────────────────
export interface User {
    id: string;
    name: string;
    phone: string;
    tg_id: string | null;
    tg_username: string | null;
    plan: "free" | "starter" | "business" | "enterprise";
    plan_expires: string | null;
    created_at: string;
    updated_at: string;
}
export type SessionStatus = "pending" | "confirmed" | "expired" | "used";
export type SessionMode = "register" | "login";
export interface AuthSession {
    token: string;
    user_id: string | null;
    phone: string;
    name: string;
    mode: SessionMode;
    status: SessionStatus;
    created_at: string;
    expires_at: string;
    confirmed_at: string | null;
    confirmed_tg_id: string | null;
    ip_address: string | null;
}
// ── Генераторы ──────────────────────────────────────────────────
export function generateUserId(): string {
    return `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}
export function generateToken(): string {
    return crypto.randomBytes(16).toString("hex").toUpperCase();
}
function expiresAt(): string {
    return new Date(Date.now() + config.authTokenTtlMs).toISOString();
}
// ── Хелпер приведения типов ─────────────────────────────────────
function toUser(row: Record<string, unknown>): User {
    return {
        id: String(row.id),
        name: String(row.name),
        phone: String(row.phone),
        tg_id: row.tg_id != null ? String(row.tg_id) : null,
        tg_username: row.tg_username != null ? String(row.tg_username) : null,
        plan: String(row.plan) as User["plan"],
        plan_expires: row.plan_expires != null ? String(row.plan_expires) : null,
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
    };
}
function toSession(row: Record<string, unknown>): AuthSession {
    return {
        token: String(row.token),
        user_id: row.user_id != null ? String(row.user_id) : null,
        phone: String(row.phone),
        name: String(row.name),
        mode: String(row.mode) as SessionMode,
        status: String(row.status) as SessionStatus,
        created_at: String(row.created_at),
        expires_at: String(row.expires_at),
        confirmed_at: row.confirmed_at != null ? String(row.confirmed_at) : null,
        confirmed_tg_id: row.confirmed_tg_id != null ? String(row.confirmed_tg_id) : null,
        ip_address: row.ip_address != null ? String(row.ip_address) : null,
    };
}
// ============================================================
// USERS
// ============================================================
export function findUserByPhone(phone: string): User | null {
    const row = prepare("SELECT * FROM users WHERE phone = ?").get(phone);
    return row ? toUser(row) : null;
}
export function findUserByTgId(tgId: string): User | null {
    const row = prepare("SELECT * FROM users WHERE tg_id = ?").get(tgId);
    return row ? toUser(row) : null;
}
export function findUserById(id: string): User | null {
    const row = prepare("SELECT * FROM users WHERE id = ?").get(id);
    return row ? toUser(row) : null;
}
export function createUser(params: {
    id: string;
    name: string;
    phone: string;
    tgId: string;
    tgUsername?: string;
}): User {
    const now = new Date().toISOString();
    prepare(`
        INSERT INTO users (id, name, phone, tg_id, tg_username, plan, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'free', ?, ?)
    `).run(
        params.id,
        params.name,
        params.phone,
        params.tgId,
        params.tgUsername ?? null,
        now,
        now
    );
    return findUserById(params.id)!;
}
export function updateUserTgData(userId: string, tgId: string, tgUsername?: string): void {
    prepare(`
        UPDATE users SET tg_id = ?, tg_username = ?, updated_at = ? WHERE id = ?
    `).run(tgId, tgUsername ?? null, new Date().toISOString(), userId);
}
// ============================================================
// AUTH SESSIONS
// ============================================================
export function createRegisterSession(params: {
    phone: string;
    name: string;
    ip?: string;
}): AuthSession {
    const token = generateToken();
    const now = new Date().toISOString();
    prepare(`
        INSERT INTO auth_sessions
        (token, user_id, phone, name, mode, status, created_at, expires_at, ip_address)
        VALUES (?, NULL, ?, ?, 'register', 'pending', ?, ?, ?)
    `).run(token, params.phone, params.name, now, expiresAt(), params.ip ?? null);
    return findSessionByToken(token)!;
}
export function createLoginSession(params: {
    phone: string;
    userId: string;
    name: string;
    ip?: string;
}): AuthSession {
    const token = generateToken();
    const now = new Date().toISOString();
    prepare(`
        INSERT INTO auth_sessions
        (token, user_id, phone, name, mode, status, created_at, expires_at, ip_address)
        VALUES (?, ?, ?, ?, 'login', 'pending', ?, ?, ?)
    `).run(token, params.userId, params.phone, params.name, now, expiresAt(), params.ip ?? null);
    return findSessionByToken(token)!;
}
export function findSessionByToken(token: string): AuthSession | null {
    const row = prepare("SELECT * FROM auth_sessions WHERE token = ?").get(token);
    return row ? toSession(row) : null;
}
export function getSessionStatus(token: string): {
    status: SessionStatus | "not_found";
    userId: string | null;
} {
    const session = findSessionByToken(token);
    if (!session) return { status: "not_found", userId: null };
    // Проверяем истечение
    if (session.status === "pending" && new Date() > new Date(session.expires_at)) {
        prepare("UPDATE auth_sessions SET status = 'expired' WHERE token = ?").run(token);
        return { status: "expired", userId: null };
    }
    return { status: session.status, userId: session.user_id };
}
export function confirmSession(
    token: string,
    tgId: string,
    tgUsername?: string
): { success: boolean; user: User | null; error?: string; mode?: string } {
    const session = findSessionByToken(token);
    if (!session) return { success: false, user: null, error: "Сессия не найдена" };
    // ── Идемпотентность ─────────────────────────────────────────────
    // Если сессия уже подтверждена этим же tg_id — просто возвращаем
    // пользователя без ошибки (Telegram мог доставить /start дважды)
    if (session.status === "confirmed") {
        const existingUser = session.user_id ? findUserById(session.user_id) : null;
        if (session.confirmed_tg_id === tgId && existingUser) {
            console.log(`♻️  Повторный /start для уже подтверждённой сессии ${token} — возвращаем юзера`);
            return { success: true, user: existingUser, mode: session.mode };
        }
        return {
            success: false,
            user: null,
            error: "Сессия уже подтверждена другим аккаунтом",
        };
    }
    if (session.status === "used") {
        return { success: false, user: null, error: "Ссылка уже использована" };
    }
    if (session.status === "expired") {
        return { success: false, user: null, error: "Ссылка истекла" };
    }
    // Доп. проверка по времени
    if (new Date() > new Date(session.expires_at)) {
        prepare("UPDATE auth_sessions SET status = 'expired' WHERE token = ?").run(token);
        return { success: false, user: null, error: "Ссылка истекла" };
    }


    const result = transaction(() => {
        let user: User | null = null;
        if (session.mode === "register") {
            const userId = generateUserId();
            user = createUser({
                id: userId,
                name: session.name,
                phone: session.phone,
                tgId,
                tgUsername,
            });
            prepare(`
        UPDATE auth_sessions
        SET status = 'confirmed', user_id = ?, confirmed_at = ?, confirmed_tg_id = ?
        WHERE token = ?
      `).run(userId, new Date().toISOString(), tgId, token);
        } else {
            user = findUserByPhone(session.phone);
            if (!user) throw new Error("Пользователь не найден при входе");
            if (user.tg_id !== tgId) {
                updateUserTgData(user.id, tgId, tgUsername);
            }
            prepare(`
        UPDATE auth_sessions
        SET status = 'confirmed', confirmed_at = ?, confirmed_tg_id = ?
        WHERE token = ?
      `).run(new Date().toISOString(), tgId, token);
            user = findUserById(user.id);
        }
        return user;
    });
    return { success: true, user: result, mode: session.mode };
}
export function markSessionUsed(token: string): void {
    prepare("UPDATE auth_sessions SET status = 'used' WHERE token = ?").run(token);
}
export function revokeToken(jti: string, expiresAtStr: string): void {
    prepare(`
        INSERT OR IGNORE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)
    `).run(jti, expiresAtStr);
}
export function isTokenRevoked(jti: string): boolean {
    const row = prepare("SELECT 1 as found FROM revoked_tokens WHERE jti = ?").get(jti);
    return !!row;
}