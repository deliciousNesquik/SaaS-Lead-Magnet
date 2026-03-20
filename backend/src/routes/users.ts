// ============================================================
// USERS ROUTES — /api/users/*
//
// GET  /api/users/by-tg/:tgId   — найти пользователя по Telegram ID
//                                  (внутренний маршрут для бота)
// GET  /api/users/me            — профиль текущего пользователя
// GET  /api/users/me/favorites  — избранные документы
// GET  /api/users/me/downloads  — история скачиваний
// ============================================================

import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import {
    findUserByTgId,
    findUserById,
} from "../database/repositories/auth.repository";
import {
    getUserFavorites,
    getUserDownloadHistory,
} from "../database/repositories/documents.repository";
import {config} from '../config/env';

const router = Router();

// ── Секрет для внутренних bot-запросов ──────────────────────────
const BOT_SECRET = config.telegram.botWebhookSecret;

// ============================================================
// GET /api/users/by-tg/:tgId
// Внутренний маршрут — только для Telegram бота
// Используется в команде /status чтобы показать данные аккаунта
// ============================================================

router.get("/by-tg/:tgId", (req: Request, res: Response) => {
    // Проверяем что запрос от нашего бота
    const secret = req.headers["x-bot-secret"];
    if (secret !== BOT_SECRET) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const { tgId } = req.params;

    if (!tgId || isNaN(Number(tgId))) {
        return res.status(400).json({ error: "Некорректный tgId" });
    }

    const user = findUserByTgId(tgId);

    if (!user) {
        return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Возвращаем только публичные поля — не JWT, не внутренние id
    return res.json({
        name: user.name,
        phone: user.phone,
        plan: user.plan,
        plan_expires: user.plan_expires,
        created_at: user.created_at,
    });
});

// ============================================================
// GET /api/users/me
// Данные текущего авторизованного пользователя
// Дублирует /api/auth/me — оставляем для RESTful структуры
// ============================================================

router.get("/me", requireAuth, (req: Request, res: Response) => {
    const user = req.user!;

    return res.json({
        id: user.id,
        name: user.name,
        phone: user.phone,
        tgId: user.tg_id,
        tgUsername: user.tg_username,
        plan: user.plan,
        planExpires: user.plan_expires,
        createdAt: user.created_at,
    });
});

// ============================================================
// GET /api/users/me/favorites
// Список избранных документов текущего пользователя
// ============================================================

router.get("/me/favorites", requireAuth, (req: Request, res: Response) => {
    const userId = req.user!.id;

    try {
        const favorites = getUserFavorites(userId);
        return res.json({ favorites, total: favorites.length });
    } catch (err) {
        console.error("Ошибка получения избранного:", err);
        return res.status(500).json({ error: "Ошибка при получении избранного" });
    }
});

// ============================================================
// GET /api/users/me/downloads
// История скачиваний текущего пользователя
// ============================================================

router.get("/me/downloads", requireAuth, (req: Request, res: Response) => {
    const userId = req.user!.id;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    try {
        const history = getUserDownloadHistory(userId, limit, offset);
        return res.json({ history, limit, offset });
    } catch (err) {
        console.error("Ошибка получения истории скачиваний:", err);
        return res.status(500).json({ error: "Ошибка при получении истории" });
    }
});

export default router;
