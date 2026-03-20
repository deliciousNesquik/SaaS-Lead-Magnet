import { useState } from "react";
import { X, Send, Phone, CheckCircle, Copy, ExternalLink } from "lucide-react";

interface TelegramModalProps {
  onClose: () => void;
  onSuccess: (user: { name: string; phone: string }) => void;
}

type Step = "phone" | "link" | "done";

export function TelegramModal({ onClose, onSuccess }: TelegramModalProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  // Имитация уникальной ссылки (в продакшне генерируется на бэкенде)
  const uniqueToken = Math.random().toString(36).substring(2, 10).toUpperCase();
  const tgLink = `https://t.me/OhranaTrudoBot?start=${uniqueToken}`;

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 10 && name.trim()) {
      setStep("link");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(tgLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = () => {
    setStep("done");
    setTimeout(() => {
      onSuccess({ name: name.trim(), phone });
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Вход через Telegram</h2>
                <p className="text-blue-100 text-sm">Быстро и без пароля</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Steps */}
          <div className="flex items-center gap-2 mt-4">
            {["Данные", "Telegram", "Готово"].map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  (step === "phone" && i === 0) || (step === "link" && i === 1) || (step === "done" && i === 2)
                    ? "bg-white text-blue-600"
                    : i < (step === "phone" ? 0 : step === "link" ? 1 : 2)
                    ? "bg-blue-400 text-white"
                    : "bg-white/20 text-white/60"
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs ${i <= (step === "phone" ? 0 : step === "link" ? 1 : 2) ? "text-white" : "text-white/50"}`}>
                  {label}
                </span>
                {i < 2 && <div className="w-8 h-px bg-white/20" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Phone + Name */}
          {step === "phone" && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <p className="text-slate-600 text-sm mb-4">
                  Введите ваши данные — с вами свяжется менеджер для предоставления пробного доступа к платформе.
                </p>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ваше имя</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Иван Петров"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Phone className="w-3.5 h-3.5 inline mr-1" />
                  Номер телефона
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                  placeholder="+7 (999) 000-00-00"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors mt-2"
              >
                Продолжить
              </button>
            </form>
          )}

          {/* Step 2: TG Link */}
          {step === "link" && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-sm text-slate-700 font-medium mb-1">Привет, {name}! 👋</p>
                <p className="text-sm text-slate-600">
                  Перейдите в нашего Telegram-бота по ссылке ниже. Менеджер свяжется с вами на номер <strong>{phone}</strong> для активации пробного периода.
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Ваша персональная ссылка</p>
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 p-3">
                  <code className="flex-1 text-xs text-blue-700 truncate">{tgLink}</code>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                  </button>
                </div>
              </div>

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

              <button
                onClick={handleConfirm}
                className="w-full border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-3 rounded-xl transition-colors text-sm"
              >
                Я перешёл в бот → войти в аккаунт
              </button>
            </div>
          )}

          {/* Step 3: Done */}
          {step === "done" && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Вход выполнен!</h3>
              <p className="text-slate-500 text-sm">Добро пожаловать, {name}. Менеджер свяжется с вами в ближайшее время.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
