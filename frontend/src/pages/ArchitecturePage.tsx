// ============================================================
// ArchitecturePage — Страница с архитектурой хранения файлов
// и логикой учёта скачиваний (для разработчиков)
// ============================================================
import {
    Server,
    Database,
    Shield,
    Download,
    FileText,
    CheckCircle,
    AlertTriangle,
    ArrowRight,
    Code2,
    HardDrive,
    Cloud,
    Lock,
    BarChart3,
    Folder,
    File,
    Globe,
    Cpu,
} from "lucide-react";
const CodeBlock = ({
                       title,
                       code,
                       lang = "ts",
                   }: {
    title: string;
    code: string;
    lang?: string;
}) => (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between bg-slate-800 px-4 py-2.5">
            <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-slate-400 text-xs font-mono ml-2">{title}</span>
            </div>
            <span className="text-slate-500 text-xs">{lang}</span>
        </div>
        <pre className="bg-slate-900 p-4 overflow-x-auto text-sm">
      <code className="text-slate-300 font-mono leading-relaxed">{code}</code>
    </pre>
    </div>
);
const InfoCard = ({
                      icon: Icon,
                      title,
                      desc,
                      color = "blue",
                      badge,
                  }: {
    icon: React.ElementType;
    title: string;
    desc: string;
    color?: string;
    badge?: string;
}) => {
    const colors: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        green: "bg-emerald-50 text-emerald-600 border-emerald-100",
        red: "bg-red-50 text-red-600 border-red-100",
        orange: "bg-orange-50 text-orange-600 border-orange-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
    };
    return (
        <div className="flex items-start gap-4 bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow">
            <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${colors[color]}`}
            >
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900 text-sm">{title}</h4>
                    {badge && (
                        <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {badge}
            </span>
                    )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
};
const FileTree = () => (
    <div className="bg-slate-900 rounded-2xl p-5 font-mono text-sm">
        <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className="text-slate-400 text-xs ml-2">Структура проекта</span>
        </div>
        <div className="space-y-0.5">
            {[
                { indent: 0, icon: "📁", name: "project/", color: "text-yellow-300" },
                { indent: 1, icon: "📁", name: "public/", color: "text-yellow-300", comment: "← Статичные файлы (доступны без сервера)" },
                { indent: 2, icon: "🖼️", name: "favicon.svg", color: "text-green-300", comment: "← Ваша иконка сюда!" },
                { indent: 2, icon: "🖼️", name: "logo.png", color: "text-green-300", comment: "← Логотип" },
                { indent: 2, icon: "🖼️", name: "og-image.svg", color: "text-green-300", comment: "← OG-картинка для соцсетей" },
                { indent: 2, icon: "📄", name: "robots.txt", color: "text-slate-400" },
                { indent: 1, icon: "📁", name: "src/", color: "text-yellow-300" },
                { indent: 2, icon: "📄", name: "App.tsx", color: "text-blue-300" },
                { indent: 2, icon: "📄", name: "index.css", color: "text-blue-300" },
                { indent: 1, icon: "📄", name: "index.html", color: "text-orange-300", comment: "← Подключаем favicon здесь" },
                { indent: 0, icon: "📁", name: "backend/", color: "text-yellow-300", comment: "← Express сервер (отдельный)" },
                { indent: 1, icon: "📁", name: "storage/", color: "text-yellow-300" },
                { indent: 2, icon: "📁", name: "templates/", color: "text-red-300", comment: "← Документы здесь (НЕ в public!)" },
                { indent: 3, icon: "📄", name: "instruktsiya-ot-ofis.docx", color: "text-slate-400" },
                { indent: 3, icon: "📄", name: "zhurnal-instruktazha.xlsx", color: "text-slate-400" },
                { indent: 3, icon: "📄", name: "prikaz-ot.docx", color: "text-slate-400" },
                { indent: 2, icon: "🗃️", name: "database.sqlite", color: "text-purple-300", comment: "← БД со всеми данными" },
                { indent: 1, icon: "📁", name: "src/", color: "text-yellow-300" },
                { indent: 2, icon: "📄", name: "routes/downloads.ts", color: "text-blue-300" },
                { indent: 2, icon: "📄", name: "routes/auth.ts", color: "text-blue-300" },
                { indent: 2, icon: "📄", name: "bot/telegram.ts", color: "text-blue-300" },
            ].map((item, i) => (
                <div
                    key={i}
                    className="flex items-start gap-1"
                    style={{ paddingLeft: `${item.indent * 20}px` }}
                >
                    <span>{item.icon}</span>
                    <span className={item.color}>{item.name}</span>
                    {item.comment && (
                        <span className="text-slate-500 text-xs ml-2">{item.comment}</span>
                    )}
                </div>
            ))}
        </div>
    </div>
);
const DOWNLOAD_FLOW = [
    {
        step: "01",
        icon: Download,
        title: "Пользователь нажимает «Скачать»",
        desc: "Фронт отправляет запрос: GET /api/documents/:id/download с JWT токеном в заголовке Authorization",
        color: "bg-blue-500",
    },
    {
        step: "02",
        icon: Shield,
        title: "Сервер проверяет авторизацию",
        desc: "Express middleware проверяет JWT. Если документ платный — проверяет подписку пользователя. Если нет → 401 Unauthorized.",
        color: "bg-purple-500",
    },
    {
        step: "03",
        icon: Database,
        title: "Запись в лог скачиваний",
        desc: "INSERT INTO download_logs (user_id, document_id, downloaded_at, ip). Счётчик downloads на документе +1.",
        color: "bg-orange-500",
    },
    {
        step: "04",
        icon: FileText,
        title: "Сервер отдаёт файл",
        desc: "res.download() — Express читает файл из backend/storage/templates/ и отправляет как бинарный поток с правильными заголовками.",
        color: "bg-emerald-500",
    },
];
const DB_SCHEMA = `-- Пользователи (уже есть)
TABLE users (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT UNIQUE NOT NULL,
  tg_id        TEXT UNIQUE,
  plan         TEXT DEFAULT 'free',   -- 'free' | 'starter' | 'business' | 'enterprise'
  plan_expires TEXT,                  -- дата окончания подписки
  created_at   TEXT NOT NULL
);
-- Документы в каталоге
TABLE documents (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  category     TEXT NOT NULL,
  type         TEXT NOT NULL,
  filename     TEXT NOT NULL,         -- реальное имя файла в storage/templates/
  is_free      INTEGER DEFAULT 0,     -- 0 = платный, 1 = бесплатный
  downloads    INTEGER DEFAULT 0,     -- общий счётчик скачиваний
  pages        INTEGER,
  updated_at   TEXT NOT NULL
);
-- Лог всех скачиваний (главная таблица аналитики)
TABLE download_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT REFERENCES users(id),
  document_id   TEXT REFERENCES documents(id) NOT NULL,
  document_name TEXT NOT NULL,        -- денормализуем для истории
  downloaded_at TEXT NOT NULL,
  ip_address    TEXT,
  user_agent    TEXT                  -- браузер пользователя
);
-- Избранное
TABLE favorites (
  user_id     TEXT REFERENCES users(id),
  document_id TEXT REFERENCES documents(id),
  added_at    TEXT NOT NULL,
  PRIMARY KEY (user_id, document_id)
);
-- История поиска
TABLE search_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT REFERENCES users(id),
  query      TEXT NOT NULL,
  results    INTEGER,                 -- сколько результатов нашло
  searched_at TEXT NOT NULL
);`;
const EXPRESS_ROUTE = `// backend/src/routes/downloads.ts
import express from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../database';
import { authMiddleware } from '../middleware/auth';
const router = express.Router();
const STORAGE_DIR = path.join(__dirname, '../../storage/templates');
// GET /api/documents/:id/download
router.get('/:id/download', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id; // из JWT
  // 1. Найти документ в БД
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  if (!doc) return res.status(404).json({ error: 'Документ не найден' });
  // 2. Проверить доступ (платный документ)
  if (!doc.is_free) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const hasAccess = user.plan !== 'free' && 
      (!user.plan_expires || new Date(user.plan_expires) > new Date());
    
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Требуется подписка',
        code: 'SUBSCRIPTION_REQUIRED' 
      });
    }
  }
  // 3. Проверить что файл существует
  const filePath = path.join(STORAGE_DIR, doc.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Файл не найден на сервере' });
  }
  // 4. Записать в лог скачиваний
  db.prepare(\`
    INSERT INTO download_logs (user_id, document_id, document_name, downloaded_at, ip_address)
    VALUES (?, ?, ?, datetime('now'), ?)
  \`).run(userId, id, doc.title, req.ip);
  // 5. Увеличить счётчик
  db.prepare('UPDATE documents SET downloads = downloads + 1 WHERE id = ?').run(id);
  // 6. Отдать файл
  const fileName = encodeURIComponent(doc.title) + path.extname(doc.filename);
  res.setHeader('Content-Disposition', \`attachment; filename*=UTF-8''\${fileName}\`);
  res.download(filePath, doc.filename);
});
// GET /api/documents/:id/downloads/stats — статистика для менеджера
router.get('/:id/downloads/stats', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  const stats = db.prepare(\`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT user_id) as unique_users,
      DATE(downloaded_at) as date,
      COUNT(*) as daily_count
    FROM download_logs 
    WHERE document_id = ?
    GROUP BY DATE(downloaded_at)
    ORDER BY date DESC
    LIMIT 30
  \`).all(id);
  
  res.json(stats);
});
export default router;`;
const FAVICON_CODE = `<!-- index.html — подключение иконки -->
<head>
  <!-- SVG фавикон (современные браузеры) -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  
  <!-- PNG фавикон (запасной вариант) -->
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
  
  <!-- Apple Touch Icon (iOS) -->
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  
  <!-- OG-image для соцсетей -->
  <meta property="og:image" content="https://ohranatrud.pro/og-image.svg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
</head>`;
const STORAGE_OPTIONS = [
    {
        icon: HardDrive,
        title: "Локальный диск (старт)",
        badge: "Сейчас",
        color: "blue",
        desc: "backend/storage/templates/ — просто папка на сервере. Дёшево, легко, подходит до 1 ГБ документов. При росте переезжаем в облако.",
        pros: ["Нулевые затраты", "Быстрый старт", "Простая настройка"],
        cons: ["Не масштабируется", "Нет CDN", "Риск потери данных"],
    },
    {
        icon: Cloud,
        title: "Cloudflare R2",
        badge: "Рекомендую",
        color: "green",
        desc: "Объектное хранилище совместимое с S3 API. Бесплатно до 10 ГБ/мес, без платы за исходящий трафик — идеально для документов.",
        pros: ["Бесплатно до 10 ГБ", "Нет платы за трафик", "CDN по всему миру"],
        cons: ["Нужна настройка", "Небольшая сложность"],
    },
    {
        icon: Globe,
        title: "Yandex Object Storage",
        badge: "Для РФ",
        color: "orange",
        desc: "Российский аналог S3 от Яндекса. Хорошая скорость внутри РФ, соответствие 152-ФЗ о персональных данных.",
        pros: ["Сервера в РФ", "152-ФЗ", "Хорошая скорость"],
        cons: ["Платный трафик", "Дороже R2"],
    },
];
export function ArchitecturePage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
            {/* Hero */}
            <section className="py-10 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                            <Cpu className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                  Для разработчика
                </span>
                            </div>
                        </div>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
                        Архитектура хранения файлов
                        <br />и учёта скачиваний
                    </h1>
                    <p className="text-lg text-slate-500 max-w-3xl">
                        Полное руководство: где хранить иконки, документы и как настроить
                        Express-маршрут с проверкой авторизации и записью аналитики в SQLite.
                    </p>
                </div>
            </section>
            {/* Структура папок */}
            <section className="pb-10 px-4">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <Folder className="w-5 h-5 text-yellow-500" />
                        Структура файлов
                    </h2>
                    <p className="text-slate-500 text-sm mb-5">
                        Главный принцип:{" "}
                        <strong className="text-red-600">
                            документы никогда не кладём в public/
                        </strong>{" "}
                        — иначе любой скачает без авторизации.
                    </p>
                    <FileTree />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                                <h3 className="font-semibold text-emerald-800">
                                    public/ — для этого
                                </h3>
                            </div>
                            {[
                                "favicon.svg, favicon.png — иконка сайта",
                                "logo.png, logo.svg — логотип компании",
                                "og-image.svg — картинка для соцсетей",
                                "robots.txt, sitemap.xml — для SEO",
                                "apple-touch-icon.png — иконка для iOS",
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-2 mb-1.5">
                                    <File className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                    <span className="text-sm text-emerald-700">{item}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                <h3 className="font-semibold text-red-800">
                                    public/ — НЕ для этого
                                </h3>
                            </div>
                            {[
                                "❌ Шаблоны документов (.docx, .xlsx)",
                                "❌ Приватные PDF и файлы",
                                "❌ Базы данных (.sqlite)",
                                "❌ Переменные окружения (.env)",
                                "❌ Любые платные материалы",
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-2 mb-1.5">
                                    <span className="text-sm text-red-700">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
            {/* Как подключить иконку */}
            <section className="pb-10 px-4 bg-slate-50/50 py-10">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-500" />
                        Как поменять иконку (favicon)
                    </h2>
                    <p className="text-slate-500 text-sm mb-5">
                        Положите файл иконки в папку{" "}
                        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700">
                            public/
                        </code>{" "}
                        и пропишите ссылку в{" "}
                        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700">
                            index.html
                        </code>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {[
                            {
                                format: "SVG",
                                badge: "Лучший",
                                desc: "Векторный, любой размер, маленький файл. Современные браузеры поддерживают.",
                                color: "green",
                            },
                            {
                                format: "PNG 512×512",
                                badge: "Рекомендую",
                                desc: "Универсальный растровый формат. Нужен для PWA и старых браузеров.",
                                color: "blue",
                            },
                            {
                                format: "ICO",
                                badge: "Устаревший",
                                desc: "Нужен только для совместимости с очень старыми браузерами (IE).",
                                color: "orange",
                            },
                        ].map((f) => (
                            <div
                                key={f.format}
                                className="bg-white rounded-2xl border border-slate-100 p-4"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <code className="font-bold text-slate-900">{f.format}</code>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            f.color === "green"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : f.color === "blue"
                                                    ? "bg-blue-100 text-blue-700"
                                                    : "bg-orange-100 text-orange-700"
                                        }`}
                                    >
                    {f.badge}
                  </span>
                                </div>
                                <p className="text-xs text-slate-500">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                    <CodeBlock
                        title="index.html — подключение иконки"
                        code={FAVICON_CODE}
                        lang="html"
                    />
                    <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-blue-800 mb-1">
                                Уже сделано в проекте
                            </p>
                            <p className="text-sm text-blue-700">
                                Файл{" "}
                                <code className="bg-blue-100 px-1 rounded">
                                    public/favicon.svg
                                </code>{" "}
                                создан. Замените его на свою иконку — просто перезапишите файл
                                или добавьте свой PNG/SVG в папку{" "}
                                <code className="bg-blue-100 px-1 rounded">public/</code>.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            {/* Схема БД */}
            <section className="py-10 px-4">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <Database className="w-5 h-5 text-purple-500" />
                        Схема базы данных SQLite
                    </h2>
                    <p className="text-slate-500 text-sm mb-5">
                        5 таблиц для полного учёта: пользователи, документы, скачивания,
                        избранное, история поиска.
                    </p>
                    <CodeBlock title="schema.sql" code={DB_SCHEMA} lang="sql" />
                </div>
            </section>
            {/* Флоу скачивания */}
            <section className="py-10 px-4 bg-slate-50/50">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <Download className="w-5 h-5 text-emerald-500" />
                        Как работает скачивание файла
                    </h2>
                    <p className="text-slate-500 text-sm mb-6">
                        4 шага от клика «Скачать» до получения файла пользователем
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                        {DOWNLOAD_FLOW.map((item, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl font-black text-slate-100">
                    {item.step}
                  </span>
                                    <div
                                        className={`w-9 h-9 ${item.color} rounded-xl flex items-center justify-center`}
                                    >
                                        <item.icon className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                <h3 className="font-semibold text-slate-900 text-sm mb-2">
                                    {item.title}
                                </h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                    <CodeBlock
                        title="backend/src/routes/downloads.ts"
                        code={EXPRESS_ROUTE}
                        lang="TypeScript"
                    />
                </div>
            </section>
            {/* Хранилища */}
            <section className="py-10 px-4">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-orange-500" />
                        Где хранить документы — варианты
                    </h2>
                    <p className="text-slate-500 text-sm mb-6">
                        Стратегия: начинаем с локального диска, при росте переезжаем в
                        облако
                    </p>
                    <div className="space-y-4">
                        {STORAGE_OPTIONS.map((opt) => (
                            <div
                                key={opt.title}
                                className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center shrink-0">
                                        <opt.icon className="w-6 h-6 text-slate-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-bold text-slate-900">{opt.title}</h3>
                                            <span
                                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                    opt.badge === "Рекомендую"
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : opt.badge === "Сейча��"
                                                            ? "bg-blue-100 text-blue-700"
                                                            : "bg-orange-100 text-orange-700"
                                                }`}
                                            >
                        {opt.badge}
                      </span>
                                        </div>
                                        <p className="text-sm text-slate-600 mb-3">{opt.desc}</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs font-semibold text-emerald-600 mb-1">
                                                    ✅ Плюсы
                                                </p>
                                                {opt.pros.map((p, i) => (
                                                    <p key={i} className="text-xs text-slate-500">
                                                        {p}
                                                    </p>
                                                ))}
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-red-500 mb-1">
                                                    ⚠️ Минусы
                                                </p>
                                                {opt.cons.map((c, i) => (
                                                    <p key={i} className="text-xs text-slate-500">
                                                        {c}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            {/* Аналитика */}
            <section className="py-10 px-4 bg-slate-50/50">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                        Что можно собирать в аналитику
                    </h2>
                    <p className="text-slate-500 text-sm mb-6">
                        Таблица download_logs даёт ценные данные для бизнеса
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            {
                                icon: BarChart3,
                                title: "Топ документов",
                                desc: "Какие документы скачивают чаще всего — понимаете что добавить в базу",
                                color: "blue",
                            },
                            {
                                icon: Download,
                                title: "История пользователя",
                                desc: "Что скачивал конкретный пользователь — менеджер знает его потребности",
                                color: "purple",
                            },
                            {
                                icon: Shield,
                                title: "Активные пользователи",
                                desc: "Кто активно пользуется — кому предложить продление подписки",
                                color: "green",
                            },
                            {
                                icon: Lock,
                                title: "Конверсия free→pro",
                                desc: "Сколько пробовали скачать платный документ — горячие лиды",
                                color: "orange",
                            },
                            {
                                icon: Server,
                                title: "Нагрузка на сервер",
                                desc: "Когда скачивают больше всего — планируете инфраструктуру",
                                color: "red",
                            },
                            {
                                icon: Code2,
                                title: "Поисковые запросы",
                                desc: "Что ищут но не находят — понимаете какие документы добавить",
                                color: "purple",
                            },
                        ].map((item) => (
                            <InfoCard key={item.title} {...item} />
                        ))}
                    </div>
                </div>
            </section>
            {/* Итог */}
            <section className="py-12 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 text-white">
                        <h2 className="text-2xl font-bold mb-4">
                            📋 Резюме — что делаем в первую очередь
                        </h2>
                        <div className="space-y-3">
                            {[
                                "Положить свою иконку: public/favicon.svg (или .png) и обновить index.html",
                                "Создать папку backend/storage/templates/ и положить первые документы (.docx, .xlsx, .pdf)",
                                "Создать таблицу download_logs в SQLite — 5 полей, 10 минут работы",
                                "Написать маршрут GET /api/documents/:id/download с проверкой JWT",
                                "Подключить маршрут к фронту — заменить alert() в DocumentCard на fetch()",
                                "Позже: переехать в Cloudflare R2 когда документов станет много",
                            ].map((step, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-xs font-bold">{i + 1}</span>
                                    </div>
                                    <p className="text-blue-100 text-sm">{step}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex items-center gap-2 bg-white/10 rounded-xl px-4 py-3">
                            <ArrowRight className="w-4 h-4 shrink-0" />
                            <p className="text-sm text-blue-100">
                                Готовый Express-маршрут выше — просто скопируйте в{" "}
                                <code className="bg-white/20 px-1 rounded">
                                    backend/src/routes/downloads.ts
                                </code>{" "}
                                и подключите к серверу
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}