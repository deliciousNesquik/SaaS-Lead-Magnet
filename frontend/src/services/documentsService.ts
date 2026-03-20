// ============================================================
// DOCUMENTS SERVICE — Запросы к /api/documents/*
// ============================================================
import { api, getJwtToken } from "./api";
import type { Document } from "@/data/documents";
// ── Типы ответов backend ────────────────────────────────────────
interface BackendDocument {
    id: string;
    title: string;
    category: string;
    type: string;
    description: string | null;
    filename: string;
    tags: string[];
    is_free: boolean;
    downloads: number;
    pages: number | null;
    updated_at: string;
    created_at: string;
    isFavorite?: boolean;
}
// Конвертируем формат backend → формат фронтенда
function toFrontendDoc(d: BackendDocument): Document {
    return {
        id: d.id,
        title: d.title,
        category: d.category,
        tags: d.tags,
        description: d.description || "",
        type: d.type as Document["type"],
        pages: d.pages || 0,
        downloads: d.downloads,
        isFree: d.is_free,
        updatedAt: d.updated_at,
    };
}
// ============================================================
// GET /api/documents
// Загрузить список документов с сервера
// ============================================================
export async function fetchDocuments(): Promise<Document[]> {
    try {
        const data = await api.get<{ documents: BackendDocument[]; total: number }>(
            "/documents"
        );
        return data.documents.map(toFrontendDoc);
    } catch {
        // Если backend недоступен — возвращаем пустой массив
        // (компонент покажет локальные данные из data/documents.ts)
        return [];
    }
}
// ============================================================
// GET /api/documents/search?q=...&category=...
// Поиск документов
// ============================================================
export async function searchDocuments(params: {
    query: string;
    category?: string;
}): Promise<{ documents: Document[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set("q", params.query);
    if (params.category && params.category !== "Все")
        searchParams.set("category", params.category);
    const data = await api.get<{ documents: BackendDocument[]; total: number }>(
        `/documents/search?${searchParams.toString()}`
    );
    return {
        documents: data.documents.map(toFrontendDoc),
        total: data.total,
    };
}
// ============================================================
// GET /api/documents/:id/download
// Скачать файл — backend проверяет авторизацию и подписку
//
// Для бесплатных: без авторизации (но всё равно логируется)
// Для платных:    нужен JWT + подписка
//
// Файл скачивается как бинарный поток (не JSON!)
// Используем window.fetch напрямую (не наш api.get)
// ============================================================
export interface DownloadError {
    code: "UNAUTHORIZED" | "SUBSCRIPTION_REQUIRED" | "SUBSCRIPTION_EXPIRED" | "FILE_NOT_FOUND" | "UNKNOWN";
    message: string;
    upgradeUrl?: string;
}
export async function downloadDocument(
    documentId: string,
    documentTitle: string
): Promise<{ success: true } | { success: false; error: DownloadError }> {
    const token = getJwtToken();
    const headers: Record<string, string> = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    try {
        const response = await fetch(`/api/documents/${documentId}/download`, {
            method: "GET",
            headers,
            credentials: "include", // httpOnly cookie
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as {
                error?: string;
                code?: string;
                upgradeUrl?: string;
            };
            return {
                success: false,
                error: {
                    code: (errorData.code as DownloadError["code"]) || "UNKNOWN",
                    message: errorData.error || "Ошибка при скачивании файла",
                    upgradeUrl: errorData.upgradeUrl,
                },
            };
        }
        // Получаем файл как blob
        const blob = await response.blob();
        // Извлекаем имя файла из заголовка Content-Disposition
        const disposition = response.headers.get("Content-Disposition");
        let filename = documentTitle + ".docx";
        if (disposition) {
            const match = disposition.match(/filename\*=UTF-8''(.+)/);
            if (match) {
                filename = decodeURIComponent(match[1]);
            }
        }
        // Создаём ссылку и инициируем скачивание
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return { success: true };
    } catch {
        return {
            success: false,
            error: {
                code: "UNKNOWN",
                message: "Ошибка сети. Проверьте подключение и попробуйте снова.",
            },
        };
    }
}
// ============================================================
// GET /api/documents/favorites
// Избранное текущего пользователя
// ============================================================
export async function getFavorites(): Promise<string[]> {
    try {
        const data = await api.get<{ favorites: BackendDocument[] }>("/documents/favorites");
        return data.favorites.map((d) => d.id);
    } catch {
        return [];
    }
}
// ============================================================
// POST /api/documents/:id/favorite
// Добавить в избранное
// ============================================================
export async function addToFavorites(documentId: string): Promise<void> {
    await api.post(`/documents/${documentId}/favorite`);
}
// ============================================================
// DELETE /api/documents/:id/favorite
// Убрать из избранного
// ============================================================
export async function removeFromFavorites(documentId: string): Promise<void> {
    await api.delete(`/documents/${documentId}/favorite`);
}
// ============================================================
// GET /api/documents/search-history/me
// История поиска текущего пользователя
// ============================================================
export async function getSearchHistory(): Promise<string[]> {
    try {
        const data = await api.get<{ history: string[] }>("/documents/search-history/me");
        return data.history;
    } catch {
        return [];
    }
}
// ============================================================
// POST /api/documents/search-history
// Сохранить поисковый запрос
// ============================================================
export async function saveSearchQuery(
    query: string,
    resultsCount: number
): Promise<void> {
    try {
        await api.post("/documents/search-history", { query, resultsCount });
    } catch {
        // Не критично если не сохранилось
    }
}
// ============================================================
// GET /api/documents/popular-queries
// Популярные поисковые запросы
// ============================================================
export async function getPopularQueries(): Promise<string[]> {
    try {
        const data = await api.get<{ queries: Array<{ query: string; count: number }> }>(
            "/documents/popular-queries"
        );
        return data.queries.map((q) => q.query);
    } catch {
        return [];
    }
}