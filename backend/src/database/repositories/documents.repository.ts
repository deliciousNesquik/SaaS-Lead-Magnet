// ============================================================
// DOCUMENTS REPOSITORY — sql.js версия
// ============================================================
import { prepare, transaction, ParamValue } from "../connectors/sqlite";
export interface Document {
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
}
export interface DownloadLog {
    id: number;
    user_id: string | null;
    document_id: string;
    document_name: string;
    downloaded_at: string;
    ip_address: string | null;
    user_agent: string | null;
}
function parseDoc(row: Record<string, unknown>): Document {
    return {
        id: String(row.id),
        title: String(row.title),
        category: String(row.category),
        type: String(row.type),
        description: row.description != null ? String(row.description) : null,
        filename: String(row.filename),
        tags: JSON.parse(String(row.tags || "[]")),
        is_free: Number(row.is_free) === 1,
        downloads: Number(row.downloads),
        pages: row.pages != null ? Number(row.pages) : null,
        updated_at: String(row.updated_at),
        created_at: String(row.created_at),
    };
}
// ── Документы ─────────────────────────────────────────────────
export function getAllDocuments(): Document[] {
    const rows = prepare("SELECT * FROM documents ORDER BY downloads DESC").all();
    return rows.map(parseDoc);
}
export function searchDocuments(params: {
    query?: string;
    category?: string;
    onlyFree?: boolean;
    limit?: number;
    offset?: number;
}): { documents: Document[]; total: number } {
    const { query = "", category, onlyFree, limit = 50, offset = 0 } = params;
    // sql.js не поддерживает именованные параметры в .all() напрямую
    // строим запрос и массив параметров вручную
    const conditions: string[] = [];
    const bindings: ParamValue[] = [];
    if (query) {
        conditions.push("(title LIKE ? OR description LIKE ? OR tags LIKE ? OR type LIKE ?)");
        const like = `%${query}%`;
        bindings.push(like, like, like, like);
    }
    if (category && category !== "Все") {
        conditions.push("category = ?");
        bindings.push(category);
    }
    if (onlyFree) {
        conditions.push("is_free = 1");
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countRow = prepare(`SELECT COUNT(*) as cnt FROM documents ${where}`).get(...bindings) as { cnt: number } | undefined;
    const total = countRow ? Number(countRow.cnt) : 0;
    const rows = prepare(
        `SELECT * FROM documents ${where} ORDER BY downloads DESC LIMIT ? OFFSET ?`
    ).all(...bindings, limit, offset);
    return { documents: rows.map(parseDoc), total };
}
export function findDocumentById(id: string): Document | null {
    const row = prepare("SELECT * FROM documents WHERE id = ?").get(id);
    return row ? parseDoc(row) : null;
}
// ── Скачивания ────────────────────────────────────────────────
export function recordDownload(params: {
    userId: string | null;
    documentId: string;
    documentName: string;
    ip?: string;
    userAgent?: string;
}): void {
    transaction(() => {
        prepare(`
      INSERT INTO download_logs (user_id, document_id, document_name, downloaded_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
            params.userId ?? null,
            params.documentId,
            params.documentName,
            new Date().toISOString(),
            params.ip ?? null,
            params.userAgent ?? null
        );
        prepare("UPDATE documents SET downloads = downloads + 1 WHERE id = ?").run(params.documentId);
    });
}
export function getUserDownloadHistory(userId: string, limit = 20, offset = 0): DownloadLog[] {
    const rows = prepare(`
        SELECT * FROM download_logs WHERE user_id = ? ORDER BY downloaded_at DESC LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    return rows.map((r) => ({
        id: Number(r.id),
        user_id: r.user_id != null ? String(r.user_id) : null,
        document_id: String(r.document_id),
        document_name: String(r.document_name),
        downloaded_at: String(r.downloaded_at),
        ip_address: r.ip_address != null ? String(r.ip_address) : null,
        user_agent: r.user_agent != null ? String(r.user_agent) : null,
    }));
}
export function getDocumentDownloadStats(documentId: string): {
    total: number;
    uniqueUsers: number;
    lastWeek: number;
    byDay: Array<{ date: string; count: number }>;
} {
    const totalRow = prepare("SELECT COUNT(*) as cnt FROM download_logs WHERE document_id = ?").get(documentId) as { cnt: number } | undefined;
    const total = totalRow ? Number(totalRow.cnt) : 0;
    const uniqueRow = prepare("SELECT COUNT(DISTINCT user_id) as cnt FROM download_logs WHERE document_id = ? AND user_id IS NOT NULL").get(documentId) as { cnt: number } | undefined;
    const uniqueUsers = uniqueRow ? Number(uniqueRow.cnt) : 0;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekRow = prepare("SELECT COUNT(*) as cnt FROM download_logs WHERE document_id = ? AND downloaded_at >= ?").get(documentId, weekAgo) as { cnt: number } | undefined;
    const lastWeek = weekRow ? Number(weekRow.cnt) : 0;
    const byDay = prepare(`
    SELECT substr(downloaded_at, 1, 10) as date, COUNT(*) as count
    FROM download_logs WHERE document_id = ?
    GROUP BY substr(downloaded_at, 1, 10)
    ORDER BY date DESC LIMIT 30
  `).all(documentId).map((r) => ({ date: String(r.date), count: Number(r.count) }));
    return { total, uniqueUsers, lastWeek, byDay };
}
export function getTopDownloadedDocuments(limit = 10): Array<{
    document_id: string;
    document_name: string;
    total_downloads: number;
    unique_users: number;
}> {
    return prepare(`
    SELECT document_id, document_name,
      COUNT(*) as total_downloads,
      COUNT(DISTINCT user_id) as unique_users
    FROM download_logs
    GROUP BY document_id
    ORDER BY total_downloads DESC
    LIMIT ?
  `).all(limit).map((r) => ({
        document_id: String(r.document_id),
        document_name: String(r.document_name),
        total_downloads: Number(r.total_downloads),
        unique_users: Number(r.unique_users),
    }));
}
// ── Избранное ─────────────────────────────────────────────────
export function addToFavorites(userId: string, documentId: string): void {
    prepare("INSERT OR IGNORE INTO favorites (user_id, document_id, added_at) VALUES (?, ?, ?)").run(
        userId, documentId, new Date().toISOString()
    );
}
export function removeFromFavorites(userId: string, documentId: string): void {
    prepare("DELETE FROM favorites WHERE user_id = ? AND document_id = ?").run(userId, documentId);
}
export function getUserFavorites(userId: string): Document[] {
    const rows = prepare(`
    SELECT d.* FROM documents d
    INNER JOIN favorites f ON f.document_id = d.id
    WHERE f.user_id = ?
    ORDER BY f.added_at DESC
  `).all(userId);
    return rows.map(parseDoc);
}
export function isFavorite(userId: string, documentId: string): boolean {
    const row = prepare("SELECT 1 as found FROM favorites WHERE user_id = ? AND document_id = ?").get(userId, documentId);
    return !!row;
}