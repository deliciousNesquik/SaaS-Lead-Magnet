// ============================================================
// SQLITE CONNECTOR — sql.js (WebAssembly, не требует компилятора!)
//
// sql.js = SQLite скомпилированный в WASM → работает на Windows/Mac/Linux
// без Visual Studio Build Tools и node-gyp
//
// Отличия от better-sqlite3:
//   - Асинхронная инициализация (ждём загрузки WASM)
//   - База данных хранится в памяти + сохраняем на диск через fs
//   - API похож, но методы чуть другие
// ============================================================
import initSqlJs, { Database, SqlJsStatic, BindParams, SqlValue } from "sql.js";
import fs from "fs";
import path from "path";
import { config } from "../../config/env";

// ── Тип для параметров запросов ───────────────────────────────
// sql.js принимает SqlValue[] где SqlValue = string | number | null | Uint8Array
// Мы разрешаем boolean → приводим к 0/1, undefined → null
export type ParamValue = string | number | boolean | null | undefined | Uint8Array;
// ── Хелпер для безопасного приведения unknown → string ────────
export function asString(val: unknown): string {
    if (typeof val === "string") return val;
    if (typeof val === "number") return String(val);
    return "";
}
// ── Хелпер для безопасного приведения unknown → number ────────
export function asNumber(val: unknown): number {
    if (typeof val === "number") return val;
    if (typeof val === "string") return Number(val);
    return 0;
}
// ── Хелпер для безопасного приведения unknown → boolean ───────
export function asBoolean(val: unknown): boolean {
    return val === 1 || val === true || val === "1";
}

function toSqlValue(val: ParamValue): SqlValue {
    if (val === undefined) return null;
    if (typeof val === "boolean") return val ? 1 : 0;
    return val as SqlValue;
}
function toBindParams(params: ParamValue[]): BindParams {
    return params.map(toSqlValue) as SqlValue[];
}

// ── Глобальный экземпляр БД ────────────────────────────────────
let _db: Database | null = null;
let _SQL: SqlJsStatic | null = null;
// ── Путь к файлу базы данных ───────────────────────────────────
const DB_PATH = config.db.path;
const DB_DIR = path.dirname(DB_PATH);
// ── Автосохранение на диск каждые 5 секунд ────────────────────
// sql.js хранит БД в памяти, нам нужно периодически писать на диск
let _saveInterval: ReturnType<typeof setInterval> | null = null;
function saveToDisk() {
    if (!_db) return;
    try {
        const data = _db.export(); // Uint8Array
        const buf = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buf);
    } catch (err) {
        console.error("❌ Ошибка сохранения БД:", err);
    }
}
// ── Инициализация ─────────────────────────────────────────────
export async function initDatabase(): Promise<Database> {
    if (_db) return _db;
    // Создаём папку если не существует
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
        console.log(`📁 Создана папка БД: ${DB_DIR}`);
    }
    // Загружаем WASM
    console.log("🔄 Загрузка sql.js (SQLite WASM)...");
    _SQL = await initSqlJs();
    // Загружаем существующую БД или создаём новую
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        _db = new _SQL.Database(fileBuffer);
        console.log(`🗃️  SQLite загружена: ${DB_PATH}`);
    } else {
        _db = new _SQL.Database();
        console.log(`🗃️  SQLite создана: ${DB_PATH}`);
    }
    // Включаем WAL режим и внешние ключи
    _db.run("PRAGMA journal_mode = WAL;");
    _db.run("PRAGMA foreign_keys = ON;");
    // Автосохранение каждые 5 секунд
    _saveInterval = setInterval(saveToDisk, 5000);
    return _db;
}
// ── Получить экземпляр БД (синхронно после инициализации) ──────
export function getDb(): Database {
    if (!_db) {
        throw new Error("База данных не инициализирована. Вызовите initDatabase() при старте сервера.");
    }
    return _db;
}
// ── Хелперы совместимые с better-sqlite3 интерфейсом ──────────
// Упрощаем работу с sql.js (у него другой API)
export interface Statement {
    run: (...params: ParamValue[]) => void;
    get: (...params: ParamValue[]) => Record<string, unknown> | undefined;
    all: (...params: ParamValue[]) => Record<string, unknown>[];
}
/**
 * prepare() — возвращает объект с методами run/get/all
 * как в better-sqlite3 для совместимости
 */
export function prepare(sql: string): Statement {
    const db = getDb();
    return {
        run(...params: ParamValue[]) {
            // sql.js db.run принимает BindParams — приводим типы
            // НЕ вызываем saveToDisk() здесь если мы внутри транзакции!
            // saveToDisk() вызывается в transaction() после COMMIT
            db.run(sql, toBindParams(params) as BindParams);
        },
        get(...params: ParamValue[]) {
            const stmt = db.prepare(sql);
            // stmt.bind принимает BindParams — приводим типы
            if (params.length > 0) {
                stmt.bind(toBindParams(params) as BindParams);
            }
            if (stmt.step()) {
                const row = stmt.getAsObject();
                stmt.free();
                return row as Record<string, unknown>;
            }
            stmt.free();
            return undefined;
        },
        all(...params: ParamValue[]) {
            const results: Record<string, unknown>[] = [];
            const stmt = db.prepare(sql);
            // stmt.bind принимает BindParams — приводим типы
            if (params.length > 0) {
                stmt.bind(toBindParams(params) as BindParams);
            }
            while (stmt.step()) {
                results.push(stmt.getAsObject() as Record<string, unknown>);
            }
            stmt.free();
            return results;
        },
    };
}
/**
 * exec() — выполнить несколько SQL команд подряд (для миграций)
 * sql.js db.run() выполняет только ПЕРВЫЙ statement из строки!
 * Для множественных statements используем разбивку по ";"
 */
export function exec(sql: string): void {
    const db = getDb();
    // Разбиваем на отдельные statements — sql.js не поддерживает multi-statement
    const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    for (const stmt of statements) {
        try {
            db.run(stmt + ";");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            // Игнорируем "already exists" при CREATE IF NOT EXISTS
            if (!msg.includes("already exists")) {
                console.error(`❌ SQL error in exec: ${msg}\nSQL: ${stmt}`);
                throw err;
            }
        }
    }
    saveToDisk();
}
/**
 * transaction() — атомарная транзакция
 *
 * sql.js особенность: нельзя вызывать db.run("BEGIN") если транзакция
 * уже активна (например вложенные вызовы). Проверяем через
 * autocommit — если false, значит транзакция уже идёт.
 */
export function transaction<T>(fn: () => T): T {
    const db = getDb();
    // autocommit === false означает что транзакция уже активна
    const isNested = !db.getRowsModified; // fallback проверка
    let weStarted = false;
    try {
        // Проверяем активна ли уже транзакция через SELECT (безопасно)
        try {
            db.run("BEGIN IMMEDIATE;");
            weStarted = true;
        } catch (beginErr: unknown) {
            const msg = beginErr instanceof Error ? beginErr.message : String(beginErr);
            // Если транзакция уже активна — работаем внутри неё (вложенный вызов)
            if (msg.includes("cannot start a transaction within a transaction")) {
                weStarted = false;
            } else {
                throw beginErr;
            }
        }
        const result = fn();
        if (weStarted) {
            db.run("COMMIT;");
            saveToDisk();
        }
        return result;
    } catch (err) {
        if (weStarted) {
            // Безопасный ROLLBACK — проверяем что транзакция ещё активна
            try {
                db.run("ROLLBACK;");
            } catch (rollbackErr: unknown) {
                const msg = rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr);
                // Игнорируем ошибку если транзакция уже закрылась
                if (!msg.includes("no transaction is active") && !msg.includes("cannot rollback")) {
                    console.error("⚠️ Ошибка rollback:", rollbackErr);
                }
            }
        }
        throw err;
    }
}
// ── Остановка ──────────────────────────────────────────────────
export function closeDatabase(): void {
    if (_saveInterval) {
        clearInterval(_saveInterval);
        _saveInterval = null;
    }
    if (_db) {
        saveToDisk(); // финальное сохранение
        _db.close();
        _db = null;
        console.log("🗃️  SQLite закрыта");
    }
}
// ============================================================
// МИГРАЦИИ
// ============================================================
export function runMigrations(): void {
    console.log("🔄 Запуск миграций...");
    exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      phone        TEXT UNIQUE NOT NULL,
      tg_id        TEXT UNIQUE,
      tg_username  TEXT,
      plan         TEXT NOT NULL DEFAULT 'free',
      plan_expires TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token        TEXT PRIMARY KEY,
      user_id      TEXT,
      phone        TEXT NOT NULL,
      name         TEXT NOT NULL,
      mode         TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at   TEXT NOT NULL,
      confirmed_at TEXT,
      confirmed_tg_id TEXT,
      ip_address   TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_status
      ON auth_sessions(status, expires_at);
    CREATE TABLE IF NOT EXISTS documents (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      category     TEXT NOT NULL,
      type         TEXT NOT NULL,
      description  TEXT,
      filename     TEXT NOT NULL,
      tags         TEXT NOT NULL DEFAULT '[]',
      is_free      INTEGER NOT NULL DEFAULT 0,
      downloads    INTEGER NOT NULL DEFAULT 0,
      pages        INTEGER,
      updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS download_logs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       TEXT,
      document_id   TEXT NOT NULL,
      document_name TEXT NOT NULL,
      downloaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      ip_address    TEXT,
      user_agent    TEXT,
      FOREIGN KEY (document_id) REFERENCES documents(id)
    );
    CREATE INDEX IF NOT EXISTS idx_download_logs_user
      ON download_logs(user_id, downloaded_at);
    CREATE INDEX IF NOT EXISTS idx_download_logs_doc
      ON download_logs(document_id, downloaded_at);
    CREATE TABLE IF NOT EXISTS favorites (
      user_id     TEXT NOT NULL,
      document_id TEXT NOT NULL,
      added_at    TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, document_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (document_id) REFERENCES documents(id)
    );
    CREATE TABLE IF NOT EXISTS search_history (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       TEXT NOT NULL,
      query         TEXT NOT NULL,
      results_count INTEGER NOT NULL DEFAULT 0,
      searched_at   TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_search_history_user
      ON search_history(user_id, searched_at);
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti         TEXT PRIMARY KEY,
      revoked_at  TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at  TEXT NOT NULL
    );
  `);
    console.log("✅ Миграции выполнены");
    seedDocuments();
}
// ── Seed данные ────────────────────────────────────────────────
function seedDocuments(): void {
    const row = prepare("SELECT COUNT(*) as cnt FROM documents").get() as { cnt: number } | undefined;
    if (row && Number(row.cnt) > 0) return;
    console.log("🌱 Заполняем тестовые документы...");
    const docs = [
        { id: "doc_001", title: "Инструкция по охране труда для офисных работников", category: "Инструкции", type: "Инструкция", description: "Типовая инструкция по ОТ для сотрудников, работающих в офисных условиях.", filename: "instruktsiya-ot-ofis.docx", tags: JSON.stringify(["офис", "общая", "ПК", "рабочее место"]), is_free: 1, downloads: 4821, pages: 8, updated_at: "2024-11-01" },
        { id: "doc_002", title: "Журнал регистрации инструктажей на рабочем месте", category: "Журналы", type: "Журнал", description: "Форма журнала для учёта проведения первичных и повторных инструктажей.", filename: "zhurnal-instruktazha.xlsx", tags: JSON.stringify(["инструктаж", "рабочее место", "регистрация"]), is_free: 1, downloads: 7342, pages: 2, updated_at: "2024-10-15" },
        { id: "doc_003", title: "Приказ о назначении ответственного за охрану труда", category: "Приказы", type: "Приказ", description: "Шаблон приказа о назначении должностного лица, ответственного за ОТ.", filename: "prikaz-naznachenie-ot.docx", tags: JSON.stringify(["ответственный", "назначение", "руководитель"]), is_free: 1, downloads: 5103, pages: 2, updated_at: "2024-09-20" },
        { id: "doc_004", title: "Акт о несчастном случае на производстве (Форма Н-1)", category: "Акты", type: "Акт", description: "Утверждённая форма акта о несчастном случае согласно ТК РФ.", filename: "akt-neschastny-sluchai-n1.docx", tags: JSON.stringify(["несчастный случай", "производство", "форма Н-1"]), is_free: 0, downloads: 3287, pages: 4, updated_at: "2024-11-10" },
        { id: "doc_005", title: "Инструкция по пожарной безопасности на предприятии", category: "Инструкции", type: "Инструкция", description: "Инструкция по обеспечению пожарной безопасности и порядку эвакуации.", filename: "instruktsiya-pozhar.docx", tags: JSON.stringify(["пожарная безопасность", "ПБ", "эвакуация"]), is_free: 1, downloads: 8834, pages: 10, updated_at: "2024-11-12" },
        { id: "doc_006", title: "Положение о системе управления охраной труда (СУОТ)", category: "Положения", type: "Положение", description: "Документ, регламентирующий СУОТ в организации согласно ГОСТ 45001.", filename: "polozhenie-suot.docx", tags: JSON.stringify(["СУОТ", "система управления", "политика ОТ"]), is_free: 0, downloads: 2891, pages: 24, updated_at: "2024-11-05" },
        { id: "doc_007", title: "Протокол проверки знаний требований охраны труда", category: "Протоколы", type: "Протокол", description: "Форма протокола заседания комиссии по проверке знаний требований ОТ.", filename: "protokol-proverki-znanii.docx", tags: JSON.stringify(["проверка знаний", "аттестация", "комиссия"]), is_free: 0, downloads: 4455, pages: 2, updated_at: "2024-09-30" },
        { id: "doc_008", title: "Журнал учёта выдачи средств индивидуальной защиты", category: "Журналы", type: "Журнал", description: "Форма журнала для учёта выдачи работникам СИЗ согласно нормам.", filename: "zhurnal-siz.xlsx", tags: JSON.stringify(["СИЗ", "средства защиты", "учёт", "выдача"]), is_free: 0, downloads: 5670, pages: 2, updated_at: "2024-10-20" },
    ];
    for (const doc of docs) {
        prepare(`
      INSERT OR IGNORE INTO documents
        (id, title, category, type, description, filename, tags, is_free, downloads, pages, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            doc.id, doc.title, doc.category, doc.type, doc.description,
            doc.filename, doc.tags, doc.is_free, doc.downloads, doc.pages, doc.updated_at
        );
    }
    console.log(`✅ Добавлено ${docs.length} документов`);
}
// ── Очистка истёкших сессий ───────────────────────────────────
export function cleanupExpiredSessions(): void {
    const now = new Date().toISOString();
    const sessions = prepare(`
    SELECT token FROM auth_sessions
    WHERE status = 'pending' AND expires_at < ?
  `).all(now);
    if (sessions.length > 0) {
        for (const s of sessions) {
            // s.token имеет тип unknown — явно приводим к string через хелпер
            prepare("UPDATE auth_sessions SET status = 'expired' WHERE token = ?").run(asString(s.token));
        }
        saveToDisk();
        console.log(`🧹 Истёкших сессий помечено: ${sessions.length}`);
    }
}