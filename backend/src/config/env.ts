// ============================================================
// CONFIG — Централизованное хранилище конфигурации
// Все переменные окружения читаются только здесь
// ============================================================
import dotenv from "dotenv";
import path from "path";
// Загружаем .env из корня backend/
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
function required(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(
            `❌ Обязательная переменная окружения не задана: ${key}\n` +
            `   Скопируйте .env.example в .env и заполните значения.`
        );
    }
    return value;
}
function optional(key: string, fallback: string): string {
    return process.env[key] ?? fallback;
}
// ── Конфигурация приложения ───────────────────────────────────
export const config = {
    // Express
    port: parseInt(optional("PORT", "3001"), 10),
    nodeEnv: optional("NODE_ENV", "development"),
    isDev: optional("NODE_ENV", "development") === "development",
    // JWT — для выдачи токенов после авторизации
    jwt: {
        secret: required("JWT_SECRET"),
        expiresIn: optional("JWT_EXPIRES_IN", "30d"),
    },
    // SQLite база данных
    db: {
        path: path.resolve(
            process.cwd(),
            optional("DATABASE_PATH", "./storage/database.sqlite")
        ),
    },
    // Telegram Bot
    telegram: {
        // Токен бота от @BotFather
        botToken: required("TELEGRAM_BOT_TOKEN"),
        // ID менеджера — кому слать уведомления о новых лидах
        managerChatId: required("TELEGRAM_MANAGER_CHAT_ID"),
        // CRM группа (опционально)
        crmChatId: optional("TELEGRAM_CRM_CHAT_ID", ""),
        // Ссылка на бота для формирования deep link
        botUsername: optional("TELEGRAM_BOT_USERNAME", "safeworkhub"),
        botWebhookSecret: required("BOT_WEBHOOK_SECRET"),
    },
    // CORS
    frontendUrl: optional("FRONTEND_URL", "http://localhost:5173"),
    // Хранилище файлов
    storage: {
        templatesDir: path.resolve(
            process.cwd(),
            optional("TEMPLATES_DIR", "./storage/templates")
        ),
    },
    // Rate limiting
    rateLimit: {
        // Максимум запросов авторизации с одного IP за 15 минут
        auth: parseInt(optional("AUTH_RATE_LIMIT", "10"), 10),
    },
    // Время жизни токена авторизации (10 минут)
    authTokenTtlMs: 10 * 60 * 1000,
} as const;
// Выводим в консоль при старте (без секретов)
export function printConfig() {
    console.log("⚙️  Конфигурация:");
    console.log(`   PORT         = ${config.port}`);
    console.log(`   NODE_ENV     = ${config.nodeEnv}`);
    console.log(`   DATABASE     = ${config.db.path}`);
    console.log(`   TEMPLATES    = ${config.storage.templatesDir}`);
    console.log(`   TG_BOT       = @${config.telegram.botUsername}`);
    console.log(`   FRONTEND_URL = ${config.frontendUrl}`);
    console.log(`   MANAGER_ID   = ${config.telegram.managerChatId}`);
}