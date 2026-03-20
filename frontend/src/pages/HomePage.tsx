import { useState, useEffect, useRef } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  TrendingUp,
  Clock,
  Star,
  WifiOff,
} from "lucide-react";
import { DOCUMENTS, SEARCH_PLACEHOLDERS, CATEGORIES } from "@/data/documents";
import type { Document } from "@/data/documents";
import { DocumentCard } from "@/components/DocumentCard";
import { cn } from "@/utils/cn";
import type { User } from "@/types/auth";
import {
  fetchDocuments,
  getSearchHistory,
  saveSearchQuery,
  getPopularQueries,
  getFavorites,
} from "@/services/documentsService";
interface HomePageProps {
  user: User | null;
  favorites: string[];
  onFavoriteToggle: (id: string) => void;
  onLoginRequired: () => void;
  searchHistory: string[];
  onSearch: (query: string) => void;
}
export function HomePage({
                           user,
                           favorites,
                           onFavoriteToggle,
                           onLoginRequired,
                           searchHistory: localSearchHistory,
                           onSearch,
                         }: HomePageProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  // Данные с backend (с fallback на локальные)
  const [documents, setDocuments] = useState<Document[]>(DOCUMENTS);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [serverSearchHistory, setServerSearchHistory] = useState<string[]>([]);
  const [popularQueries, setPopularQueries] = useState<string[]>([
    "Инструкция по пожарной безопасности",
    "Журнал инструктажей",
    "Приказ о назначении",
    "Форма Н-1",
  ]);
  // Загружаем документы с backend
  useEffect(() => {
    setIsLoadingDocs(true);
    fetchDocuments()
        .then((docs) => {
          if (docs.length > 0) {
            setDocuments(docs);
            setBackendAvailable(true);
          } else {
            // Backend недоступен или пустой — используем локальные данные
            setBackendAvailable(false);
          }
        })
        .finally(() => setIsLoadingDocs(false));
  }, []);
  // Загружаем историю поиска и популярные запросы для авторизованных
  useEffect(() => {
    if (!user) return;
    getSearchHistory()
        .then(setServerSearchHistory)
        .catch(() => {});
    getPopularQueries()
        .then((queries) => {
          if (queries.length > 0) setPopularQueries(queries);
        })
        .catch(() => {});
  }, [user]);
  // Загружаем избранное с сервера при авторизации
  useEffect(() => {
    if (!user) return;
    getFavorites()
        .then((ids) => {
          // Синхронизируем избранное с сервера с локальным стейтом
          ids.forEach((id) => {
            if (!favorites.includes(id)) {
              onFavoriteToggle(id);
            }
          });
        })
        .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  // ── Анимированный placeholder ──────────────────────────────
  useEffect(() => {
    const target = SEARCH_PLACEHOLDERS[placeholderIdx];
    let charIdx = 0;
    let timeout: ReturnType<typeof setTimeout>;
    if (isTyping) {
      const typeNext = () => {
        if (charIdx <= target.length) {
          setDisplayedPlaceholder(target.slice(0, charIdx));
          charIdx++;
          timeout = setTimeout(typeNext, 45);
        } else {
          timeout = setTimeout(() => setIsTyping(false), 1800);
        }
      };
      typeNext();
    } else {
      const eraseNext = () => {
        if (charIdx >= 0) {
          setDisplayedPlaceholder(target.slice(0, charIdx));
          charIdx--;
          timeout = setTimeout(eraseNext, 25);
        } else {
          setPlaceholderIdx((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
          setIsTyping(true);
        }
      };
      charIdx = target.length;
      eraseNext();
    }
    return () => clearTimeout(timeout);
  }, [placeholderIdx, isTyping]);
  // ── Закрытие dropdown при клике вне ───────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
          historyRef.current &&
          !historyRef.current.contains(e.target as Node)
      ) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  // ── Обработка поиска ───────────────────────────────────────
  const handleSearch = (q: string) => {
    setQuery(q);
    if (q.trim()) {
      // Сохраняем в локальный стейт родителя
      onSearch(q.trim());
      // Сохраняем на сервере если авторизован
      // POST /api/documents/search-history
      if (user) {
        const resultsCount = documents.filter(
            (doc) =>
                doc.title.toLowerCase().includes(q.toLowerCase()) ||
                doc.tags.some((t) => t.toLowerCase().includes(q.toLowerCase())) ||
                doc.type.toLowerCase().includes(q.toLowerCase())
        ).length;
        saveSearchQuery(q.trim(), resultsCount).catch(() => {});
      }
    }
    setShowHistory(false);
  };
  // ── Фильтрация документов ──────────────────────────────────
  const filtered = documents.filter((doc) => {
    const matchQuery =
        query.trim() === "" ||
        doc.title.toLowerCase().includes(query.toLowerCase()) ||
        doc.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())) ||
        doc.type.toLowerCase().includes(query.toLowerCase());
    const matchCat = category === "Все" || doc.category === category;
    return matchQuery && matchCat;
  });
  // Объединяем историю поиска: с сервера + локальная (если нет сервера)
  const displayHistory =
      serverSearchHistory.length > 0 ? serverSearchHistory : localSearchHistory;
  return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="pt-28 pb-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <TrendingUp className="w-3.5 h-3.5" />
              Более 500+ актуальных документов по охране труда
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-4">
              Найдите нужный документ
              <br />
              <span className="text-blue-600">по охране труда</span> за секунды
            </h1>
            <p className="text-lg text-slate-500 mb-6 max-w-2xl mx-auto">
              Актуальные шаблоны приказов, инструкций, журналов и актов.
              Скачивайте, настраивайте под вашу организацию и соответствуйте
              требованиям законодательства.
            </p>
            {/* Статус авторизации */}
            {user ? (
                <div className="inline-flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium px-4 py-2 rounded-full mb-6">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Вы вошли как <strong>{user.name}</strong> — доступны все
                  Pro-документы и избранное
                </div>
            ) : (
                <div className="inline-flex items-center gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2 rounded-full mb-6">
                  <span className="w-2 h-2 bg-amber-500 rounded-full" />
                  Войдите через Telegram, чтобы скачивать Pro-документы и сохранять
                  историю
                </div>
            )}
            {/* Backend недоступен — предупреждение */}
            {!backendAvailable && !isLoadingDocs && (
                <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-500 text-xs px-3 py-1.5 rounded-full mb-4">
                  <WifiOff className="w-3.5 h-3.5" />
                  Backend недоступен — показаны демо-данные. Запустите:{" "}
                  <code className="font-mono bg-slate-100 px-1 rounded">
                    cd backend && npm run dev
                  </code>
                </div>
            )}
            {/* ── Строка поиска ──────────────────────────────── */}
            <div className="relative max-w-2xl mx-auto" ref={historyRef}>
              <div className="relative flex items-center bg-white rounded-2xl border-2 border-slate-200 focus-within:border-blue-500 shadow-lg shadow-slate-100 transition-colors">
                <Search className="absolute left-5 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowHistory(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && query.trim()) handleSearch(query);
                    }}
                    placeholder={displayedPlaceholder}
                    className="w-full pl-14 pr-12 py-4 bg-transparent text-slate-900 text-base placeholder:text-slate-400 focus:outline-none rounded-2xl"
                />
                {query && (
                    <button
                        onClick={() => {
                          setQuery("");
                          inputRef.current?.focus();
                        }}
                        className="absolute right-4 w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                )}
              </div>
              {/* Dropdown: история и популярное */}
              {showHistory && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl z-20 overflow-hidden">
                    {/* История поиска (только для авторизованных) */}
                    {user && displayHistory.length > 0 && (
                        <div className="p-3 border-b border-slate-50">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-2 mb-2 flex items-center gap-1.5">
                            <Clock className="w-3 h-3" /> История поиска
                          </p>
                          {displayHistory
                              .slice(-5)
                              .reverse()
                              .map((h, i) => (
                                  <button
                                      key={i}
                                      onClick={() => handleSearch(h)}
                                      className="w-full text-left px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                                  >
                                    <Clock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                    {h}
                                  </button>
                              ))}
                        </div>
                    )}
                    {/* Подсказка для незалогиненных */}
                    {!user && (
                        <div className="p-3 border-b border-slate-50 bg-blue-50/50">
                          <p className="text-xs text-slate-500 px-2 flex items-center gap-1.5">
                            <Star className="w-3 h-3 text-amber-400" />
                            <span>
                        <button
                            className="text-blue-600 font-medium hover:underline"
                            onClick={() => {
                              setShowHistory(false);
                              onLoginRequired();
                            }}
                        >
                          Войдите
                        </button>
                        , чтобы сохранять историю поиска и избранное
                      </span>
                          </p>
                        </div>
                    )}
                    {/* Популярные запросы */}
                    <div className="p-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-2 mb-2 flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3" /> Популярные запросы
                      </p>
                      {popularQueries.slice(0, 5).map((p, i) => (
                          <button
                              key={i}
                              onClick={() => handleSearch(p)}
                              className="w-full text-left px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                          >
                            <Search className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            {p}
                          </button>
                      ))}
                    </div>
                  </div>
              )}
            </div>
          </div>
        </section>
        {/* ── Фильтр по категориям ────────────────────────────── */}
        <section className="pb-6 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
              {CATEGORIES.map((cat) => (
                  <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={cn(
                          "shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors border",
                          category === cat
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:border-blue-200 hover:text-blue-600"
                      )}
                  >
                    {cat}
                  </button>
              ))}
            </div>
          </div>
        </section>
        {/* ── Счётчик результатов ──────────────────────────────── */}
        <section className="pb-6 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Найдено{" "}
                <strong className="text-slate-900">{filtered.length}</strong>{" "}
                документов
                {query && (
                    <>
                      {" "}
                      по запросу «
                      <span className="text-blue-600">{query}</span>»
                    </>
                )}
                {!backendAvailable && (
                    <span className="ml-2 text-slate-400 text-xs">(демо)</span>
                )}
              </p>
              {query && (
                  <button
                      onClick={() => setQuery("")}
                      className="text-sm text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Сбросить
                  </button>
              )}
            </div>
          </div>
        </section>
        {/* ── Сетка документов ────────────────────────────────── */}
        <section className="pb-20 px-4">
          <div className="max-w-7xl mx-auto">
            {isLoadingDocs ? (
                // Skeleton загрузки
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                      <div
                          key={i}
                          className="bg-white rounded-2xl border border-slate-100 h-64 animate-pulse"
                      >
                        <div className="h-1 bg-slate-200 rounded-t-2xl" />
                        <div className="p-5 space-y-3">
                          <div className="h-4 bg-slate-100 rounded-lg w-1/3" />
                          <div className="h-4 bg-slate-100 rounded-lg w-full" />
                          <div className="h-4 bg-slate-100 rounded-lg w-4/5" />
                          <div className="h-3 bg-slate-100 rounded-lg w-2/3" />
                        </div>
                      </div>
                  ))}
                </div>
            ) : filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.map((doc) => (
                      <DocumentCard
                          key={doc.id}
                          doc={doc}
                          isFavorite={favorites.includes(doc.id)}
                          isLoggedIn={!!user}
                          onFavoriteToggle={onFavoriteToggle}
                          onLoginRequired={onLoginRequired}
                      />
                  ))}
                </div>
            ) : (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Search className="w-7 h-7 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    Ничего не найдено
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Попробуйте изменить запрос или выбрать другую категорию
                  </p>
                  <button
                      onClick={() => {
                        setQuery("");
                        setCategory("Все");
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Показать все документы
                  </button>
                </div>
            )}
          </div>
        </section>
      </div>
  );
}