// ============================================================
// AuthModal — Модал регистрации и входа через Telegram
// ============================================================

import { useState, useEffect } from "react";
import {
  X,
  Send,
  Phone,
  User as UserIcon,
  CheckCircle,
  Copy,
  ExternalLink,
  Loader2,
  AlertCircle,
  Clock,
  ArrowLeft,
  LogIn,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/utils/cn";
import type { ModalMode, ModalStep, AuthStatus } from "@/types/auth";
import { registerStart, loginStart } from "@/services/authService";

interface AuthModalProps {
  onClose: () => void;
  onPollingStart: (token: string, mode: ModalMode) => void;
  pollStatus: AuthStatus;
  defaultMode?: ModalMode;
}

export function AuthModal({
  onClose,
  onPollingStart,
  pollStatus,
  defaultMode = "login",
}: AuthModalProps) {
  const [mode, setMode] = useState<ModalMode>(defaultMode);
  const [step, setStep] = useState<ModalStep>("form");

  // Форма
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Ссылка
  const [tgLink, setTgLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Таймер истечения токена (10 минут)
  const [secondsLeft, setSecondsLeft] = useState(600);

  // Переключение на waiting запускает таймер
  useEffect(() => {
    if (step !== "waiting") return;
    setSecondsLeft(600);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Реагируем на статус поллинга из родителя
  useEffect(() => {
    if (pollStatus === "confirmed") {
      setStep("success");
      setTimeout(() => onClose(), 2000);
    }
  }, [pollStatus, onClose]);

  // ── Handlers ──────────────────────────────────────────────

  const handlePhoneChange = (value: string) => {
    // Форматируем телефон
    const digits = value.replace(/\D/g, "");
    let formatted = value;
    if (digits.length > 0 && !value.startsWith("+")) {
      formatted = "+" + digits;
    }
    setPhone(formatted);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setFormError("Введите корректный номер телефона");
      return;
    }
    if (mode === "register" && name.trim().length < 2) {
      setFormError("Введите ваше имя (минимум 2 символа)");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "register") {
        const result = await registerStart(name.trim(), phone);
        setTgLink(result.tgLink);
        setStep("waiting");
        onPollingStart(result.token, "register");
      } else {
        const result = await loginStart(phone);
        setName(result.userName);
        setTgLink(result.tgLink);
        setStep("waiting");
        onPollingStart(result.token, "login");
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "PHONE_EXISTS") {
        setFormError(error.message || "Номер уже зарегистрирован");
        // Предлагаем переключиться на вход
      } else if (error.code === "USER_NOT_FOUND") {
        setFormError(error.message || "Аккаунт не найден");
      } else {
        setFormError("Произошла ошибка. Попробуйте ещё раз.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(tgLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwitchMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setFormError(null);
    setName("");
    setPhone("");
    setStep("form");
  };

  const handleBack = () => {
    setStep("form");
    setFormError(null);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight">
                  {mode === "register" ? "Регистрация" : "Вход в аккаунт"}
                </h2>
                <p className="text-blue-100 text-xs">
                  Через Telegram — быстро и без пароля
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step indicators */}
          <StepIndicator step={step} />
        </div>

        <div className="p-6">
          {/* ── STEP: FORM ── */}
          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-slate-500 text-sm">
                {mode === "register"
                  ? "Введите данные для регистрации. Менеджер свяжется с вами для активации пробного периода."
                  : "Введите ваш номер телефона — мы отправим ссылку для входа через Telegram."}
              </p>

              {mode === "register" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Ваше имя
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="Иван Петров"
                      autoComplete="name"
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Номер телефона
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    autoComplete="tel"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-700">{formError}</p>
                    {formError.includes("зарегистрирован") && (
                      <button
                        type="button"
                        onClick={handleSwitchMode}
                        className="text-xs text-red-600 font-semibold hover:underline mt-1"
                      >
                        → Перейти ко входу
                      </button>
                    )}
                    {formError.includes("найден") && (
                      <button
                        type="button"
                        onClick={handleSwitchMode}
                        className="text-xs text-red-600 font-semibold hover:underline mt-1"
                      >
                        → Зарегистрироваться
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === "register" ? (
                  <UserPlus className="w-4 h-4" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {isSubmitting
                  ? "Подождите..."
                  : mode === "register"
                  ? "Зарегистрироваться"
                  : "Получить ссылку для входа"}
              </button>

              {/* Switch mode */}
              <div className="text-center text-sm text-slate-500">
                {mode === "register" ? (
                  <>
                    Уже есть аккаунт?{" "}
                    <button
                      type="button"
                      onClick={handleSwitchMode}
                      className="text-blue-600 font-medium hover:underline"
                    >
                      Войти
                    </button>
                  </>
                ) : (
                  <>
                    Нет аккаунта?{" "}
                    <button
                      type="button"
                      onClick={handleSwitchMode}
                      className="text-blue-600 font-medium hover:underline"
                    >
                      Зарегистрироваться
                    </button>
                  </>
                )}
              </div>
            </form>
          )}

          {/* ── STEP: WAITING (ссылка + поллинг) ── */}
          {step === "waiting" && (
            <div className="space-y-4">
              {/* Кому */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {name} 👋
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {mode === "register"
                        ? "Для завершения регистрации перейдите в Telegram-бота по ссылке ниже."
                        : "Для входа в аккаунт перейдите в Telegram-бота по ссылке ниже."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Статус поллинга */}
              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 border",
                  pollStatus === "expired"
                    ? "bg-red-50 border-red-100"
                    : "bg-amber-50 border-amber-100"
                )}
              >
                {pollStatus === "expired" ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-700">
                        Ссылка истекла
                      </p>
                      <p className="text-xs text-red-600">
                        Запросите новую ссылку
                      </p>
                    </div>
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-1 text-xs text-red-600 font-semibold hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Повторить
                    </button>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800">
                        Ожидаем подтверждения от бота
                      </p>
                      <p className="text-xs text-amber-700">
                        Перейдите по ссылке в Telegram
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <Clock className="w-3 h-3" />
                      {formatTime(secondsLeft)}
                    </div>
                  </>
                )}
              </div>

              {/* Ссылка */}
              {pollStatus !== "expired" && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      Ваша персональная ссылка
                    </p>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 p-3">
                      <code className="flex-1 text-xs text-blue-700 break-all">
                        {tgLink}
                      </code>
                      <button
                        onClick={handleCopy}
                        className="shrink-0 w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
                        title="Скопировать ссылку"
                      >
                        {copied ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">
                      🔒 Ссылка одноразовая и действует {formatTime(secondsLeft)}
                    </p>
                  </div>

                  {/* TG кнопка */}
                  <a
                    href={tgLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#1a8fc0] text-white font-medium py-3 rounded-xl transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Открыть Telegram-бота
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>

                  {/* Инструкция */}
                  <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Что делать в боте:
                    </p>
                    {[
                      mode === "register"
                        ? "Бот попросит подтвердить регистрацию"
                        : "Бот попросит подтвердить вход",
                      "Нажмите кнопку «Подтвердить»",
                      "Страница обновится автоматически",
                    ].map((s, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-4 h-4 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-xs text-slate-600">{s}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Назад */}
              <button
                onClick={handleBack}
                className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Назад
              </button>
            </div>
          )}

          {/* ── STEP: SUCCESS ── */}
          {step === "success" && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">
                {mode === "register" ? "Регистрация успешна!" : "Вход выполнен!"}
              </h3>
              <p className="text-slate-500 text-sm mb-1">
                Добро пожаловать, <strong>{name}</strong>!
              </p>
              {mode === "register" && (
                <p className="text-slate-400 text-xs">
                  Менеджер свяжется с вами по номеру {phone} для активации
                  пробного доступа к платформе.
                </p>
              )}
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Закрываем...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step Indicator ─────────────────────────────────────────

function StepIndicator({ step }: { step: ModalStep }) {
  const steps = [
    { key: "form", label: "Данные" },
    { key: "waiting", label: "Telegram" },
    { key: "success", label: "Готово" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
              i < currentIdx
                ? "bg-blue-300 text-white"
                : i === currentIdx
                ? "bg-white text-blue-600"
                : "bg-white/20 text-white/60"
            )}
          >
            {i < currentIdx ? <CheckCircle className="w-4 h-4" /> : i + 1}
          </div>
          <span
            className={cn(
              "text-xs transition-colors",
              i <= currentIdx ? "text-white" : "text-white/50"
            )}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className="w-8 h-px bg-white/20" />
          )}
        </div>
      ))}
    </div>
  );
}
