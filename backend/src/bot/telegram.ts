// ============================================================
// TELEGRAM BOT — Отдельный процесс
// Запуск: npm run dev:bot
//
// Функции:
//   /start TOKEN → PATCH /api/auth/confirm/TOKEN → отвечает пользователю
//   /help, /status — информационные команды
// ============================================================
import { config, printConfig } from "../config/env";
import { initDatabase, runMigrations } from "../database/connectors/sqlite";
import {
    getRegistrationSuccessMessage,
    getLoginSuccessMessage,
    getExpiredTokenMessage,
    getUsedTokenMessage,
} from "./notification";
// ── Типы Telegram API ────────────────────────────────────────────
interface TgUpdate {
    update_id: number;
    message?: TgMessage;
}
interface TgMessage {
    message_id: number;
    from: TgUser;
    chat: TgChat;
    text?: string;
    date: number;
}
interface TgUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    is_bot: boolean;
}
interface TgChat {
    id: number;
    type: string;
}
// ── Telegram Bot API клиент ──────────────────────────────────────
class TelegramBot {
    private baseUrl: string;
    private offset: number = 0;
    private isRunning: boolean = false;
    // Дедупликация — храним последние N обработанных update_id
    private processedUpdates: Set<number> = new Set();
    private readonly MAX_PROCESSED = 1000; // чистим когда набирается 1000
    constructor(private token: string) {
        this.baseUrl = `https://api.telegram.org/bot${token}`;
    }
    private async call<T>(method: string, body?: object): Promise<T> {
        const response = await fetch(`${this.baseUrl}/${method}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : undefined,
        });
        const data = (await response.json()) as { ok: boolean; result: T; description?: string };
        if (!data.ok) {
            throw new Error(`Telegram API ${method}: ${data.description}`);
        }
        return data.result;
    }
    async sendMessage(chatId: number, text: string, parseMode: "HTML" | "Markdown" = "HTML"): Promise<void> {
        await this.call("sendMessage", {
            chat_id: chatId,
            text,
            parse_mode: parseMode,
        });
    }
    private async getUpdates(): Promise<TgUpdate[]> {
        return this.call<TgUpdate[]>("getUpdates", {
            offset: this.offset,
            timeout: 30,
            allowed_updates: ["message"],
        });
    }
    async start(handler: (update: TgUpdate) => Promise<void>) {
        this.isRunning = true;
        console.log("🤖 Telegram бот запущен (long polling)");
        while (this.isRunning) {
            try {
                const updates = await this.getUpdates();
                for (const update of updates) {
                    // Сдвигаем offset чтобы не получить этот update снова
                    this.offset = update.update_id + 1;
                    // Дедупликация — Telegram иногда повторно шлёт одинаковые update
                    if (this.processedUpdates.has(update.update_id)) {
                        console.log(`⏭️  Пропускаю дубликат update_id=${update.update_id}`);
                        continue;
                    }
                    // Запоминаем как обработанный
                    this.processedUpdates.add(update.update_id);
                    // Чистим старые записи чтобы Set не рос бесконечно
                    if (this.processedUpdates.size > this.MAX_PROCESSED) {
                        const oldest = [...this.processedUpdates].slice(0, 100);
                        oldest.forEach((id) => this.processedUpdates.delete(id));
                    }
                    // Обрабатываем в фоне — не блокируем polling
                    handler(update).catch((err) => {
                        console.error("❌ Ошибка обработки update:", err);
                    });
                }
            } catch (err) {
                console.error("❌ Ошибка polling:", err);
                await new Promise((r) => setTimeout(r, 5000));
            }
        }
    }
    stop() {
        this.isRunning = false;
    }
}
// ── Запрос подтверждения на сервер ──────────────────────────────
const SERVER_URL = `http://localhost:${config.port}`;
const BOT_SECRET = config.telegram.botWebhookSecret;
async function confirmAuthSession(
    token: string,
    tgId: number,
    tgUsername?: string
): Promise<{
    success: boolean;
    mode?: "register" | "login";
    user?: { name: string; phone: string };
    error?: string;
}> {
    const response = await fetch(`${SERVER_URL}/api/auth/confirm/${token}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "x-bot-secret": BOT_SECRET,
        },
        body: JSON.stringify({ tg_id: tgId, tg_username: tgUsername }),
    });
    return response.json() as Promise<{
        success: boolean;
        mode?: "register" | "login";
        user?: { name: string; phone: string };
        error?: string;
    }>;
}
// ── Обработчики команд ───────────────────────────────────────────
async function handleStartCommand(bot: TelegramBot, message: TgMessage, token: string) {
    const { from, chat } = message;
    console.log(`🔑 /start ${token} от @${from.username || from.id} (${from.first_name})`);
    try {
        const result = await confirmAuthSession(token, from.id, from.username);
        if (result.success && result.user) {
            const text =
                result.mode === "register"
                    ? getRegistrationSuccessMessage(result.user.name)
                    : getLoginSuccessMessage(result.user.name);
            await bot.sendMessage(chat.id, text);
            console.log(
                `✅ ${result.mode === "register" ? "Зарегистрирован" : "Вошёл"}: ${result.user.name} (tg: ${from.id})`
            );
        } else if (!result.success) {
            const error = result.error ?? "Неизвестная ошибка";
            // Идемпотентность: если сессия уже подтверждена этим же пользователем
            // — не показываем ошибку, просто говорим что всё ок
            if (error.includes("уже подтверждена") && !error.includes("другим")) {
                await bot.sendMessage(
                    chat.id,
                    "✅ <b>Вы уже авторизованы!</b>\n\nВернитесь на сайт — страница обновится автоматически."
                );
                console.log(`ℹ️  Повторный /start от ${from.id} — уже авторизован`);
                return;
            }
            if (error.includes("истекла") || error.includes("expired")) {
                await bot.sendMessage(chat.id, getExpiredTokenMessage());
            } else if (error.includes("использована") || error.includes("used")) {
                await bot.sendMessage(chat.id, getUsedTokenMessage());
            } else {
                await bot.sendMessage(
                    chat.id,
                    `❌ <b>Ошибка авторизации</b>\n\n${error}\n\nВернитесь на сайт и попробуйте снова.`
                );
            }
            console.warn(`⚠️  Ошибка auth для ${from.id}: ${error}`);
        }
    } catch (err) {
        console.error("❌ Ошибка запроса к серверу:", err);
        await bot.sendMessage(chat.id, `😔 <b>Ошибка соединения</b>\n\nНе удалось связаться с сервером.\nПопробуйте позже.`);
    }
}
async function handleHelpCommand(bot: TelegramBot, chatId: number) {
    await bot.sendMessage(chatId, `
<b>Центр охраны труда</b>
Этот бот используется для авторизации на платформе.
<b>Как войти:</b>
1. Зайдите на сайт safeworkhub.pro
2. Нажмите "Войти" или "Регистрация"
3. Введите телефон → получите ссылку
4. Перейдите по ссылке в этот бот
5. Страница обновится автоматически ✅
<b>Команды:</b>
/help — эта справка
/status — статус аккаунта
  `.trim());
}
async function handleStatusCommand(bot: TelegramBot, chatId: number, tgId: number) {
    try {
        const response = await fetch(`${SERVER_URL}/api/users/by-tg/${tgId}`, {
            headers: { "x-bot-secret": BOT_SECRET },
        });
        if (response.ok) {
            const user = await response.json() as { name: string; phone: string; plan: string; plan_expires?: string };
            const planNames: Record<string, string> = {
                free: "Бесплатный", starter: "Стартовый",
                business: "Бизнес", enterprise: "Корпоративный",
            };
            await bot.sendMessage(chatId, `
✅ <b>Ваш аккаунт</b>
👤 <b>Имя:</b> ${user.name}
📞 <b>Телефон:</b> <code>${user.phone}</code>
📋 <b>Тариф:</b> ${planNames[user.plan] || user.plan}
${user.plan_expires ? `⏰ <b>До:</b> ${new Date(user.plan_expires).toLocaleDateString("ru-RU")}` : ""}
      `.trim());
        } else {
            await bot.sendMessage(chatId, "ℹ️ Аккаунт не найден.\n\nЗарегистрируйтесь: safeworkhub.pro");
            await bot.sendMessage(chatId, response.statusText);
        }
    } catch {
        await bot.sendMessage(chatId, "😔 Ошибка при получении данных.");
    }
}
// ── Главный обработчик ───────────────────────────────────────────
async function handleUpdate(bot: TelegramBot, update: TgUpdate): Promise<void> {
    const message = update.message;
    if (!message?.text) return;
    const { chat, text } = message;
    const trimmed = text.trim();
    if (trimmed.startsWith("/start ")) {
        const token = trimmed.slice(7).trim();
        if (token) {
            await handleStartCommand(bot, message, token);
        } else {
            await bot.sendMessage(chat.id, "👋 Перейдите на <b>safeworkhub.pro</b> и нажмите «Войти» для получения ссылки.");
        }
        return;
    }
    if (trimmed === "/start") {
        await bot.sendMessage(chat.id, "👋 Зайдите на <b>safeworkhub.pro</b> → нажмите «Войти через Telegram».\n\n/help — справка");
        return;
    }
    if (trimmed === "/help") {
        await handleHelpCommand(bot, chat.id);
        return;
    }
    if (trimmed === "/status") {
        await handleStatusCommand(bot, chat.id, message.from.id);
        return;
    }
    await bot.sendMessage(chat.id, "Для работы с платформой: <b>safeworkhub.pro</b>\n\n/help — справка");
}
// ── Запуск ───────────────────────────────────────────────────────
async function main() {
    console.log("🤖 Запуск Telegram бота...");
    printConfig();
    // Бот тоже инициализирует БД — он запускается отдельным процессом
    await initDatabase();
    runMigrations();
    const bot = new TelegramBot(config.telegram.botToken);
    process.on("SIGINT", () => {
        console.log("\n⛔ Остановка бота...");
        bot.stop();
        process.exit(0);
    });
    process.on("SIGTERM", () => {
        bot.stop();
        process.exit(0);
    });
    await bot.start((update) => handleUpdate(bot, update));
}
main().catch((err) => {
    console.error("💀 Критическая ошибка бота:", err);
    process.exit(1);
});