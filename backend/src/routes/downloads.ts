// ============================================================
// DOWNLOADS ROUTES — /api/documents/*
// Скачивание файлов с проверкой авторизации и учётом аналитики
// ============================================================
//
// GET  /api/documents              — список всех документов
// GET  /api/documents/search       — поиск документов
// GET  /api/documents/:id          — один документ
// GET  /api/documents/:id/download — скачать файл (с проверкой подписки)
// GET  /api/documents/:id/stats    — статистика скачиваний (только для менеджера)
//
// GET  /api/documents/history      — история скачиваний пользователя
// GET  /api/documents/favorites    — избранное пользователя
// POST /api/documents/:id/favorite — добавить в избранное
// DELETE /api/documents/:id/favorite — убрать из избранного
//
// POST /api/documents/search-history — сохранить запрос поиска
// GET  /api/documents/popular-queries — популярные запросы
//
// ============================================================
import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { config } from "../config/env";
import {
    getAllDocuments,
    searchDocuments,
    findDocumentById,
    recordDownload,
    getUserDownloadHistory,
    getDocumentDownloadStats,
    getTopDownloadedDocuments,
    addToFavorites,
    removeFromFavorites,
    getUserFavorites,
    isFavorite,
} from "../database/repositories/documents.repository";
import {
    saveSearchQuery,
    getUserSearchHistory,
    getPopularQueries,
    getZeroResultQueries,
} from "../database/repositories/search.repository";
import { requireAuth, optionalAuth } from "../middleware/authMiddleware";
const router = Router();
// ============================================================
// GET /api/documents
// Список всех документов (с опциональной авторизацией)
// ============================================================
router.get("/", optionalAuth, (_req: Request, res: Response) => {
    const documents = getAllDocuments();
    return res.json({
        documents,
        total: documents.length,
    });
});
// ============================================================
// GET /api/documents/search?q=...&category=...
// Поиск документов
// ============================================================
router.get("/search", optionalAuth, (req: Request, res: Response) => {
    const { q, category, free, limit, offset } = req.query;
    const result = searchDocuments({
        query: String(q || ""),
        category: category ? String(category) : undefined,
        onlyFree: free === "true",
        limit: limit ? parseInt(String(limit)) : 50,
        offset: offset ? parseInt(String(offset)) : 0,
    });
    // Сохраняем запрос в историю если пользователь авторизован
    if (req.user && q && String(q).trim().length >= 2) {
        saveSearchQuery({
            userId: req.user.id,
            query: String(q),
            resultsCount: result.total,
        });
    }
    return res.json(result);
});
// ============================================================
// GET /api/documents/history
// История скачиваний авторизованного пользователя
// ============================================================
router.get("/history", requireAuth, (req: Request, res: Response) => {
    const history = getUserDownloadHistory(req.user!.id, 20);
    return res.json({ history });
});
// ============================================================
// GET /api/documents/favorites
// Избранное авторизованного пользователя
// ============================================================
router.get("/favorites", requireAuth, (req: Request, res: Response) => {
    const favorites = getUserFavorites(req.user!.id);
    return res.json({ favorites, total: favorites.length });
});
// ============================================================
// GET /api/documents/popular-queries
// Популярные поисковые запросы (для подсказок в строке поиска)
// ============================================================
router.get("/popular-queries", (_req: Request, res: Response) => {
    const queries = getPopularQueries(10);
    return res.json({ queries });
});
// ============================================================
// GET /api/documents/analytics (только для менеджера/админа)
// Аналитика скачиваний
// ============================================================
router.get("/analytics", requireAuth, (req: Request, res: Response) => {
    // TODO: добавить роль admin в User
    // Пока доступно всем авторизованным (в продакшне ограничить)
    const topDocs = getTopDownloadedDocuments(20);
    const zeroQueries = getZeroResultQueries(20);
    return res.json({
        topDocuments: topDocs,
        zeroResultQueries: zeroQueries,
        message: "Эти данные помогают понять что добавить в базу документов",
    });
});
// ============================================================
// GET /api/documents/:id
// Один документ по ID
// ============================================================
router.get("/:id", optionalAuth, (req: Request, res: Response) => {
    const doc = findDocumentById(req.params.id);
    if (!doc) {
        return res.status(404).json({ error: "Документ не найден" });
    }
    // Для авторизованных пользователей добавляем признак "в избранном"
    const favorite = req.user ? isFavorite(req.user.id, doc.id) : false;
    return res.json({ ...doc, isFavorite: favorite });
});
// ============================================================
// GET /api/documents/:id/download
// ГЛАВНЫЙ МАРШРУТ — скачивание файла
//
// Логика:
//   1. Проверяем авторизацию (requireAuth)
//   2. Находим документ в БД
//   3. Если документ платный — проверяем подписку пользователя
//   4. Проверяем что файл существует на диске
//   5. Записываем в download_logs + счётчик +1
//   6. Отдаём файл через res.download()
// ============================================================
router.get("/:id/download", optionalAuth, (req: Request, res: Response) => {
    const doc = findDocumentById(req.params.id);
    if (!doc) {
        return res.status(404).json({ error: "Документ не найден" });
    }
    // Бесплатные документы — без авторизации
    // Платные — нужна подписка
    if (!doc.is_free) {
        if (!req.user) {
            return res.status(401).json({
                error: "Войдите через Telegram для скачивания Pro-документов",
                code: "UNAUTHORIZED",
                tgAuthRequired: true,
            });
        }
        const user = req.user;
        // Проверяем подписку
        if (user.plan === "free") {
            return res.status(403).json({
                error: "Для скачивания этого документа необходима подписка",
                code: "SUBSCRIPTION_REQUIRED",
                upgradeUrl: `${config.frontendUrl}/platform`,
            });
        }
        // Проверяем что подписка не истекла
        if (user.plan_expires && new Date(user.plan_expires) < new Date()) {
            return res.status(403).json({
                error: "Ваша подписка истекла. Обновите тарифный план.",
                code: "SUBSCRIPTION_EXPIRED",
                expiredAt: user.plan_expires,
                upgradeUrl: `${config.frontendUrl}/platform`,
            });
        }
    }
    // Ищем файл на диске
    const filePath = path.join(config.storage.templatesDir, doc.filename);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Файл не найден: ${filePath}`);
        return res.status(404).json({
            error: "Файл временно недоступен. Обратитесь в поддержку.",
            code: "FILE_NOT_FOUND",
        });
    }
    // Записываем скачивание в аналитику
    recordDownload({
        userId: req.user?.id ?? null,
        documentId: doc.id,
        documentName: doc.title,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
    });
    // Правильное имя файла для скачивания (кириллица поддерживается)
    const ext = path.extname(doc.filename);
    const downloadName = doc.title.replace(/[/\\?%*:|"<>]/g, "-") + ext;
    // Устанавливаем заголовки для корректного скачивания
    res.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`
    );
    res.setHeader("Content-Type", getMimeType(ext));
    // Отдаём файл
    res.download(filePath, downloadName, (err) => {
        if (err) {
            console.error(`❌ Ошибка при скачивании ${filePath}:`, err);
            if (!res.headersSent) {
                res.status(500).json({ error: "Ошибка при скачивании файла" });
            }
        }
    });
});
// ============================================================
// GET /api/documents/:id/stats
// Статистика скачиваний документа
// ============================================================
router.get("/:id/stats", requireAuth, (req: Request, res: Response) => {
    const doc = findDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Документ не найден" });
    const stats = getDocumentDownloadStats(req.params.id);
    return res.json({ documentId: req.params.id, documentTitle: doc.title, ...stats });
});
// ============================================================
// POST /api/documents/:id/favorite
// Добавить в избранное
// ============================================================
router.post("/:id/favorite", requireAuth, (req: Request, res: Response) => {
    const doc = findDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Документ не найден" });
    addToFavorites(req.user!.id, req.params.id);
    return res.json({ success: true, message: "Добавлено в избранное" });
});
// ============================================================
// DELETE /api/documents/:id/favorite
// Убрать из избранного
// ============================================================
router.delete("/:id/favorite", requireAuth, (req: Request, res: Response) => {
    removeFromFavorites(req.user!.id, req.params.id);
    return res.json({ success: true, message: "Убрано из избранного" });
});
// ============================================================
// POST /api/documents/search-history
// Сохранить запрос в историю поиска
// ============================================================
router.post("/search-history", requireAuth, (req: Request, res: Response) => {
    const { query, resultsCount } = req.body;
    if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "query обязателен" });
    }
    saveSearchQuery({
        userId: req.user!.id,
        query,
        resultsCount: resultsCount ?? 0,
    });
    return res.json({ success: true });
});
// ============================================================
// GET /api/documents/search-history/me
// История поиска текущего пользователя
// ============================================================
router.get("/search-history/me", requireAuth, (req: Request, res: Response) => {
    const history = getUserSearchHistory(req.user!.id, 10);
    return res.json({ history });
});
// ── Хелпер MIME types ───────────────────────────────────────────
function getMimeType(ext: string): string {
    const types: Record<string, string> = {
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc": "application/msword",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xls": "application/vnd.ms-excel",
        ".pdf": "application/pdf",
        ".zip": "application/zip",
    };
    return types[ext.toLowerCase()] || "application/octet-stream";
}
export default router;