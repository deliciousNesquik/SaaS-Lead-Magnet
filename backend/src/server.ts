// ============================================================
// SERVER — Точка входа Express приложения
// sql.js требует async инициализации (загрузка WASM)
// ============================================================
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { config, printConfig } from "./config/env";
import { initDatabase, runMigrations, cleanupExpiredSessions } from "./database/connectors/sqlite";
import authRouter from "./routes/auth";
import downloadsRouter from "./routes/downloads";
import usersRouter from "./routes/users";
async function bootstrap() {
    printConfig();
    // ── 1. Инициализируем SQLite (WASM — нужен await!) ────────────
    await initDatabase();
    runMigrations();
    // ── 2. Создаём папку для файлов шаблонов ─────────────────���────
    if (!fs.existsSync(config.storage.templatesDir)) {
        fs.mkdirSync(config.storage.templatesDir, { recursive: true });
        console.log(`📁 Создана папка для шаблонов: ${config.storage.templatesDir}`);
        fs.writeFileSync(
            path.join(config.storage.templatesDir, "README.txt"),
            `Положите файлы документов в эту папку:
  instruktsiya-ot-ofis.docx      — Инструкция для офисных работников
  zhurnal-instruktazha.xlsx      — Журнал инструктажей
  prikaz-naznachenie-ot.docx     — Приказ о назначении ответственного
  ...
Имена файлов должны совпадать с полем "filename" в таблице documents.
`
        );
    }
    // ── 3. Express ─────────────────────────────────────────────────
    const app = express();
    app.use(cors({
        origin: config.frontendUrl,
        credentials: true,
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "x-bot-secret"],
    }));
    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    // ── 4. Маршруты ────────────────────────────────────────────────
    app.use("/api/auth", authRouter);
    app.use("/api/documents", downloadsRouter);
    app.use("/api/users", usersRouter);
    app.get("/health", (_req, res) => {
        res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
        });
    });
    app.use("/api/*", (_req, res) => {
        res.status(404).json({ error: "Маршрут не найден" });
    });
    // ── 5. Фронтенд (production) ────────────────────────────────────
    if (!config.isDev) {
        const frontendDist = path.resolve(__dirname, "../../frontend/dist");
        if (fs.existsSync(frontendDist)) {
            app.use(express.static(frontendDist));
            app.get("*", (_req, res) => {
                res.sendFile(path.join(frontendDist, "index.html"));
            });
        }
    }
    // ── 6. Глобальный обработчик ошибок ───────────────────────────
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        console.error("💥 Необработанная ошибка:", err);
        res.status(500).json({
            error: config.isDev ? err.message : "Внутренняя ошибка сервера",
        });
    });
    // ── 7. Запуск ──────────────────────────────────────────────────
    app.listen(config.port, () => {
        console.log("");
        console.log(`✅ Сервер: http://localhost:${config.port}`);
        console.log(`📡 API:    http://localhost:${config.port}/api`);
        console.log(`🏥 Health: http://localhost:${config.port}/health`);
        console.log("");
        console.log(`📁 Шаблоны: ${config.storage.templatesDir}`);
        console.log("");
    });
    // Очищаем истёкшие сессии каждые 5 минут
    setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
    process.on("SIGTERM", () => {
        console.log("⛔ SIGTERM — завершение...");
        process.exit(0);
    });
}
bootstrap().catch((err) => {
    console.error("💀 Ошибка запуска сервера:", err);
    process.exit(1);
});