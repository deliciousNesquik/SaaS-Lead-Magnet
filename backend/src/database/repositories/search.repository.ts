// ============================================================
// SEARCH REPOSITORY — sql.js версия
// ============================================================
import { prepare } from "../connectors/sqlite";
export function saveSearchQuery(params: {
    userId: string;
    query: string;
    resultsCount: number;
}): void {
    if (!params.query || params.query.trim().length < 2) return;
    prepare(`
        INSERT INTO search_history (user_id, query, results_count, searched_at)
        VALUES (?, ?, ?, ?)
    `).run(params.userId, params.query.trim(), params.resultsCount, new Date().toISOString());
}
export function getUserSearchHistory(userId: string, limit = 10): string[] {
    const rows = prepare(`
    SELECT DISTINCT query FROM search_history
    WHERE user_id = ?
    ORDER BY searched_at DESC
    LIMIT ?
  `).all(userId, limit);
    return rows.map((r) => String(r.query));
}
export function getPopularQueries(limit = 10): Array<{ query: string; count: number }> {
    return prepare(`
    SELECT query, COUNT(*) as count
    FROM search_history
    GROUP BY query
    ORDER BY count DESC
    LIMIT ?
  `).all(limit).map((r) => ({ query: String(r.query), count: Number(r.count) }));
}
export function getZeroResultQueries(limit = 20): Array<{ query: string; count: number }> {
    return prepare(`
    SELECT query, COUNT(*) as count
    FROM search_history
    WHERE results_count = 0
    GROUP BY query
    ORDER BY count DESC
    LIMIT ?
  `).all(limit).map((r) => ({ query: String(r.query), count: Number(r.count) }));
}
export function clearUserSearchHistory(userId: string): void {
    prepare("DELETE FROM search_history WHERE user_id = ?").run(userId);
}