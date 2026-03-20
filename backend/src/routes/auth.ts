// ============================================================
// AUTH ROUTES — /api/auth/*
// Полный цикл авторизации через Telegram Bot
// ============================================================
//
// POST   /api/auth/register         — начать регистрацию (имя + телефон → TG ссылка)
// POST   /api/auth/login            — начать вход (телефон → TG ссылка)
// GET    /api/auth/status/:token    — поллинг статуса (фронт каждые 2 сек)
// POST   /api/auth/session/:token   — получить JWT после подтверждения
// PATCH  /api/auth/confirm/:token   — подтверждение от Telegram Bot (внутренний)
// POST   /api/auth/logout           — выход (отзыв JWT)
// GET    /api/auth/me               — данные текущего пользователя
//
// ============================================================
import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config/env";
import {
    findUserByPhone,
    findUserById,
    createRegisterSession,
    createLoginSession,
    findSessionByToken,
    getSessionStatus,
    confirmSession,
    markSessionUsed,
    revokeToken,
} from "../database/repositories/auth.repository";
import { requireAuth, generateJwt } from "../middleware/authMiddleware";
import { notifyManagerNewLead } from "../bot/notification";
const router = Router();
// ── Rate Limiting ────────────────────────────────────────────────
// Максимум 10 попыток регистрации/входа с одного IP за 15 минут
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: config.rateLimit.auth,
    message: {
        error: "Слишком много попыток. Попробуйте через 15 минут.",
        code: "RATE_LIMIT_EXCEEDED",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// ── Хелпер: нормализация телефона ───────────────────────────────
function normalizePhone(phone: string): string {
    // Убираем всё кроме цифр и +
    const digits = phone.replace(/\D/g, "");
    // Приводим к формату +7XXXXXXXXXX
    if (digits.startsWith("8") && digits.length === 11) {
        return "+7" + digits.slice(1);
    }
    if (digits.startsWith("7") && digits.length === 11) {
        return "+" + digits;
    }
    return "+" + digits;
}
function validatePhone(phone: string): boolean {
    const normalized = normalizePhone(phone);
    return /^\+7\d{10}$/.test(normalized);
}
// ============================================================
// POST /api/auth/register
// Шаг 1 регистрации: принимаем имя + телефон, создаём сессию
// ============================================================
router.post("/register", authLimiter, (req: Request, res: Response) => {
    const { name, phone } = req.body;
    // Валидация
    if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({
            error: "Введите корректное имя (минимум 2 символа)",
            code: "INVALID_NAME",
        });
    }
    if (!phone || !validatePhone(phone)) {
        return res.status(400).json({
            error: "Введите корректный номер телефона в формате +7XXXXXXXXXX",
            code: "INVALID_PHONE",
        });
    }
    const normalizedPhone = normalizePhone(phone);
    // Проверяем что телефон не занят
    const existingUser = findUserByPhone(normalizedPhone);
    if (existingUser) {
        return res.status(409).json({
            error: "Этот номер телефона уже зарегистрирован. Используйте вход в аккаунт.",
            code: "PHONE_EXISTS",
        });
    }
    // Создаём сессию
    const session = createRegisterSession({
        name: name.trim(),
        phone: normalizedPhone,
        ip: req.ip,
    });
    // Формируем Telegram deep link
    // Когда пользователь перейдёт по ссылке — бот получит /start TOKEN
    const tgLink = `https://t.me/${config.telegram.botUsername}?start=${session.token}`;
    return res.status(201).json({
        token: session.token,
        tgLink,
        expiresAt: session.expires_at,
        message: "Перейдите по ссылке в Telegram-бот для завершения регистрации",
    });
});
// ============================================================
// POST /api/auth/login
// Шаг 1 входа: принимаем телефон, ищем пользователя, создаём сессию
// ============================================================
router.post("/login", authLimiter, (req: Request, res: Response) => {
    const { phone } = req.body;
    if (!phone || !validatePhone(phone)) {
        return res.status(400).json({
            error: "Введите корректный номер телефона",
            code: "INVALID_PHONE",
        });
    }
    const normalizedPhone = normalizePhone(phone);
    const user = findUserByPhone(normalizedPhone);
    if (!user) {
        return res.status(404).json({
            error: "Аккаунт с таким номером не найден. Зарегистрируйтесь.",
            code: "USER_NOT_FOUND",
        });
    }
    const session = createLoginSession({
        phone: normalizedPhone,
        userId: user.id,
        name: user.name,
        ip: req.ip,
    });
    const tgLink = `https://t.me/${config.telegram.botUsername}?start=${session.token}`;
    return res.status(201).json({
        token: session.token,
        tgLink,
        expiresAt: session.expires_at,
        userName: user.name,
        message: "Перейдите по ссылке в Telegram-бот для входа в аккаунт",
    });
});
// ============================================================
// GET /api/auth/status/:token
// Поллинг статуса — фронт вызывает каждые 2 секунды
// После confirmed → фронт вызывает POST /api/auth/session/:token
// ============================================================
router.get("/status/:token", (req: Request, res: Response) => {
    const { token } = req.params;
    if (!token || token.length < 10) {
        return res.status(400).json({ error: "Некорректный токен" });
    }
    const { status, userId } = getSessionStatus(token);
    if (status === "not_found") {
        return res.status(404).json({
            status: "expired",
            message: "Сессия не найдена или истекла",
        });
    }
    return res.json({
        status,
        // Для confirmed не возвращаем userId (безопасность)
        // Фронт должен позвать /session/:token чтобы получить JWT
        confirmed: status === "confirmed",
    });
});
// ============================================================
// POST /api/auth/session/:token
// Обмен подтверждённого токена на JWT
// Вызывается однократно после того как поллинг вернул 'confirmed'
// ============================================================
router.post("/session/:token", (req: Request, res: Response) => {
    const { token } = req.params;
    const { status, userId } = getSessionStatus(token);
    if (status !== "confirmed" || !userId) {
        return res.status(400).json({
            error: "Сессия не подтверждена или истекла",
            code: "SESSION_NOT_CONFIRMED",
        });
    }
    const user = findUserById(userId);
    if (!user) {
        return res.status(500).json({ error: "Ошибка: пользователь не найден" });
    }
    // Генерируем JWT
    const { token: jwt, jti, expiresAt } = generateJwt(user.id);
    // Помечаем сессию как использованную (нельзя обменять дважды)
    markSessionUsed(token);
    // Устанавливаем httpOnly cookie (безопаснее чем localStorage)
    res.cookie("auth_token", jwt, {
        httpOnly: true,
        secure: !config.isDev,
        sameSite: config.isDev ? "lax" : "strict",
        expires: expiresAt,
        path: "/",
    });
    return res.json({
        token: jwt,        // Также возвращаем в теле для SPA без cookie
        expiresAt: expiresAt.toISOString(),
        user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            tgId: user.tg_id,
            plan: user.plan,
            planExpires: user.plan_expires,
        },
    });
});
// ============================================================
// PATCH /api/auth/confirm/:token
// ВНУТРЕННИЙ МАРШРУТ — вызывается только Telegram Bot webhook
//
// Флоу бота:
//   1. Пользователь переходит по ссылке t.me/bot?start=TOKEN
//   2. Бот получает команду /start TOKEN от telegram
//   3. Бот делает HTTP запрос: PATCH /api/auth/confirm/TOKEN
//      Body: { tg_id: "123456789", tg_username: "ivan_petrov" }
//   4. Сервер подтверждает сессию:
//      - register: создаёт пользователя в БД
//      - login: находит пользователя по phone
//   5. Сервер возвращает { success: true, user }
//   6. Бот получает ответ → пишет пользователю "✅ Авторизация успешна!"
//   7. Бот уведомляет менеджера о новом лиде (если регистрация)
// ============================================================
// Защита: только запросы с секретным заголовком от бота
const BOT_SECRET = config.telegram.botWebhookSecret;
router.patch("/confirm/:token", (req: Request, res: Response) => {
    // Проверяем что запрос от нашего бота
    const secret = req.headers["x-bot-secret"];
    if (secret !== BOT_SECRET) {
        return res.status(403).json({ error: "Forbidden" });
    }
    const { token } = req.params;
    const { tg_id, tg_username } = req.body;
    if (!tg_id) {
        return res.status(400).json({ error: "tg_id обязателен" });
    }
    const session = findSessionByToken(token);
    if (!session) {
        return res.status(404).json({ error: "Сессия не найдена" });
    }
    const result = confirmSession(token, String(tg_id), tg_username);
    if (!result.success) {
        // Возвращаем 200 с success: false — бот сам покажет нужное сообщение
        // НЕ возвращаем 4xx чтобы бот не ломался с unhandled rejection
        return res.json({ success: false, error: result.error });
    }
    // Уведомляем менеджера о новой регистрации (асинхронно, не блокируем ответ)
    // Только при первичной регистрации, не при повторном /start
    if (result.mode === "register" && result.user) {
        notifyManagerNewLead({
            userName: result.user.name,
            phone: result.user.phone,
            tgUsername: tg_username,
        }).catch(console.error);
    }
    return res.json({
        success: true,
        mode: result.mode ?? session.mode,
        user: result.user
            ? {
                id: result.user.id,
                name: result.user.name,
                phone: result.user.phone,
            }
            : null,
    });
});
// ============================================================
// POST /api/auth/logout
// Отзываем JWT ��окен (добавляем в blacklist)
// ============================================================
router.post("/logout", requireAuth, (req: Request, res: Response) => {
    const jti = req.jti!;
    const session = findSessionByToken(""); // TODO: получить из JWT
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    revokeToken(jti, expiresAt);
    // Очищаем cookie
    res.clearCookie("auth_token", { path: "/" });
    return res.json({ success: true, message: "Вы вышли из аккаунта" });
});
// ============================================================
// GET /api/auth/me
// Данные текущего пользователя (для восстановления сессии при перезагрузке)
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
export default router;