// ============================================================
// AUTH MIDDLEWARE — Проверка JWT
// ============================================================
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config/env";
import { findUserById, isTokenRevoked } from "../database/repositories/auth.repository";
import type { User } from "../database/repositories/auth.repository";
declare global {
    namespace Express {
        interface Request {
            user?: User;
            jti?: string;
        }
    }
}
export interface JwtPayload {
    sub: string;
    jti: string;
    iat: number;
    exp: number;
}
// ── Обязательная авторизация ─────────────────────────────────
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ error: "Требуется авторизация", code: "UNAUTHORIZED" });
    }
    try {
        const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
        if (isTokenRevoked(payload.jti)) {
            return res.status(401).json({ error: "Сессия завершена", code: "TOKEN_REVOKED" });
        }
        const user = findUserById(payload.sub);
        if (!user) {
            return res.status(401).json({ error: "Пользователь не найден", code: "USER_NOT_FOUND" });
        }
        req.user = user;
        req.jti = payload.jti;
        next();
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: "Сессия истекла", code: "TOKEN_EXPIRED" });
        }
        return res.status(401).json({ error: "Недействительный токен", code: "TOKEN_INVALID" });
    }
}
// ── Опциональная авторизация ─────────────────────────────────
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
    const token = extractToken(req);
    if (!token) return next();
    try {
        const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
        if (!isTokenRevoked(payload.jti)) {
            const user = findUserById(payload.sub);
            if (user) {
                req.user = user;
                req.jti = payload.jti;
            }
        }
    } catch {
        // Игнорируем невалидный токен
    }
    next();
}
// ── Проверка подписки ─────────────────────────────────────────
export function requireSubscription(req: Request, res: Response, next: NextFunction) {
    const user = req.user!;
    if (user.plan === "free") {
        return res.status(403).json({
            error: "Для скачивания Pro-документов необходима подписка",
            code: "SUBSCRIPTION_REQUIRED",
            upgradeUrl: `${config.frontendUrl}/platform`,
        });
    }
    if (user.plan_expires && new Date(user.plan_expires) < new Date()) {
        return res.status(403).json({
            error: "Ваша подписка истекла",
            code: "SUBSCRIPTION_EXPIRED",
            expiredAt: user.plan_expires,
            upgradeUrl: `${config.frontendUrl}/platform`,
        });
    }
    next();
}
// ── Хелперы ──────────────────────────────────────────────────
function extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }
    if (req.cookies?.auth_token) {
        return req.cookies.auth_token;
    }
    return null;
}
export function generateJwt(userId: string): {
    token: string;
    jti: string;
    expiresAt: Date;
} {
    const jti = crypto.randomBytes(16).toString("hex");
    const token = jwt.sign(
        { sub: userId, jti },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn as jwt.SignOptions["expiresIn"] }
    );
    const payload = jwt.decode(token) as JwtPayload;
    const expiresAt = new Date(payload.exp * 1000);
    return { token, jti, expiresAt };
}
