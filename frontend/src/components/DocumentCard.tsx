import { useState } from "react";
import {
  Download,
  Star,
  Lock,
  FileText,
  BookOpen,
  ClipboardList,
  AlertTriangle,
  FileCheck,
  BookMarked,
  MessageSquare,
  GraduationCap,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/utils/cn";
import type { Document } from "@/data/documents";
import { downloadDocument, addToFavorites, removeFromFavorites } from "@/services/documentsService";
interface DocumentCardProps {
  doc: Document;
  isFavorite: boolean;
  isLoggedIn: boolean;
  onFavoriteToggle: (id: string) => void;
  onLoginRequired: () => void;
}
const TYPE_ICONS: Record<string, React.ElementType> = {
  Инструкция: BookOpen,
  Журнал: ClipboardList,
  Приказ: FileCheck,
  Акт: AlertTriangle,
  Положение: BookMarked,
  Протокол: MessageSquare,
  Распоряжение: FileText,
  Программа: GraduationCap,
};
const TYPE_COLORS: Record<string, string> = {
  Инструкции: "bg-blue-50 text-blue-700 border-blue-100",
    Журнал: "bg-purple-50 text-purple-700 border-purple-100",
    Приказ: "bg-orange-50 text-orange-700 border-orange-100",
    Акт: "bg-red-50 text-red-700 border-red-100",
    Положение: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Протокол: "bg-indigo-50 text-indigo-700 border-indigo-100",
    Распоряжение: "bg-amber-50 text-amber-700 border-amber-100",
    Программа: "bg-teal-50 text-teal-700 border-teal-100",
};
export function DocumentCard({
                               doc,
                               isFavorite,
                               isLoggedIn,
                               onFavoriteToggle,
                               onLoginRequired,
                             }: DocumentCardProps) {
  const Icon = TYPE_ICONS[doc.type] || FileText;
  const colorClass = TYPE_COLORS[doc.type] || "bg-slate-50 text-slate-700 border-slate-100";
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isFavLoading, setIsFavLoading] = useState(false);
  // ── Скачивание ─────────────────────────────────────────────
  const handleDownload = async () => {
    // Платный документ без авторизации → показываем модал входа
    if (!doc.isFree && !isLoggedIn) {
      onLoginRequired();
      return;
    }
    setIsDownloading(true);
    setDownloadError(null);
    // Реальный запрос к backend: GET /api/documents/:id/download
    const result = await downloadDocument(doc.id, doc.title);
    setIsDownloading(false);
    if (result.success) {
      // Показываем галочку на 2 секунды
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 2000);
    } else {
      const err = result.error;
      // Если требуется авторизация/подписка — показываем модал
      if (err.code === "UNAUTHORIZED") {
        onLoginRequired();
        return;
      }
      if (err.code === "SUBSCRIPTION_REQUIRED" || err.code === "SUBSCRIPTION_EXPIRED") {
        setDownloadError("Требуется подписка для скачивания этого документа");
        setTimeout(() => setDownloadError(null), 4000);
        return;
      }
      if (err.code === "FILE_NOT_FOUND") {
        setDownloadError("Файл временно недоступен");
        setTimeout(() => setDownloadError(null), 4000);
        return;
      }
      setDownloadError(err.message);
      setTimeout(() => setDownloadError(null), 4000);
    }
  };
  // ── Избранное ────────────────────────────���─────────────────
  const handleFavorite = async () => {
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }
    setIsFavLoading(true);
    try {
      if (isFavorite) {
        // DELETE /api/documents/:id/favorite
        await removeFromFavorites(doc.id);
      } else {
        // POST /api/documents/:id/favorite
        await addToFavorites(doc.id);
      }
      // Уведомляем родителя об изменении (он обновит локальный state)
      onFavoriteToggle(doc.id);
    } catch {
      // Тихо игнорируем ошибки избранного
    } finally {
      setIsFavLoading(false);
    }
  };
  // Кнопка скачивания: текст/иконка меняются по состоянию
  const renderDownloadButton = () => {
    if (isDownloading) {
      return (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Загрузка...
          </>
      );
    }
    if (downloadDone) {
      return (
          <>
            <CheckCircle className="w-3.5 h-3.5" />
            Скачано!
          </>
      );
    }
    if (!doc.isFree && !isLoggedIn) {
      return (
          <>
            <Lock className="w-3.5 h-3.5" />
            Войти для скачивания
          </>
      );
    }
    return (
        <>
          <Download className="w-3.5 h-3.5" />
          Скачать шаблон
        </>
    );
  };
  return (
      <div className="group bg-white rounded-2xl border border-slate-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50/50 transition-all duration-200 overflow-hidden flex flex-col">
        {/* Top accent */}
        <div
            className={cn(
                "h-1",
                doc.isFree
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                    : "bg-gradient-to-r from-blue-500 to-indigo-600"
            )}
        />
        <div className="p-5 flex flex-col flex-1">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div
                className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold",
                    colorClass
                )}
            >
              <Icon className="w-3.5 h-3.5" />
              {doc.type}
            </div>
            <div className="flex items-center gap-1.5">
              {doc.isFree ? (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                Бесплатно
              </span>
              ) : (
                  <span className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" /> Pro
              </span>
              )}
            </div>
          </div>
          {/* Title */}
          <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-2 group-hover:text-blue-700 transition-colors">
            {doc.title}
          </h3>
          {/* Description */}
          <p className="text-xs text-slate-500 leading-relaxed mb-3 flex-1">
            {doc.description}
          </p>
          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-4">
            {doc.tags.slice(0, 3).map((tag) => (
                <span
                    key={tag}
                    className="text-xs bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-full"
                >
              {tag}
            </span>
            ))}
          </div>
          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
            <span>{doc.pages} стр.</span>
            <span>↓ {doc.downloads.toLocaleString("ru")}</span>
            <span>
            {new Date(doc.updatedAt).toLocaleDateString("ru-RU", {
              month: "short",
              year: "numeric",
            })}
          </span>
          </div>
          {/* Ошибка скачивания */}
          {downloadError && (
              <div className="mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                {downloadError}
              </div>
          )}
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
                onClick={handleDownload}
                disabled={isDownloading}
                className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    downloadDone
                        ? "bg-emerald-500 text-white"
                        : !doc.isFree && !isLoggedIn
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200",
                    isDownloading && "opacity-70 cursor-not-allowed"
                )}
            >
              {renderDownloadButton()}
            </button>
            <button
                onClick={handleFavorite}
                disabled={isFavLoading}
                className={cn(
                    "w-10 h-10 rounded-xl border flex items-center justify-center transition-all",
                    isFavorite
                        ? "bg-amber-50 border-amber-200 text-amber-500"
                        : "bg-slate-50 border-slate-200 text-slate-400 hover:text-amber-400 hover:border-amber-200",
                    isFavLoading && "opacity-50 cursor-not-allowed"
                )}
                title={
                  isLoggedIn
                      ? isFavorite
                          ? "Убрать из избранного"
                          : "В избранное"
                      : "Войдите для добавления в избранное"
                }
            >
              {isFavLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                  <Star className={cn("w-4 h-4", isFavorite && "fill-amber-400")} />
              )}
            </button>
          </div>
        </div>
      </div>
  );
}