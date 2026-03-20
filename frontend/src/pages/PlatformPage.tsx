import { Check, X, Zap, Building2, Crown, Send, ArrowRight, Users, FileText, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/utils/cn";

interface PlatformPageProps {
  onLoginClick: () => void;
}

const PLANS = [
  {
    id: "starter",
    name: "Стартовый",
    price: "4 900",
    period: "мес",
    description: "Для небольших компаний до 50 сотрудников",
    icon: Zap,
    color: "border-slate-200",
    headerBg: "bg-slate-50",
    badge: null,
    features: [
      { text: "До 50 сотрудников", included: true },
      { text: "Все шаблоны документов", included: true },
      { text: "Редактор под организацию", included: true },
      { text: "Поиск по базе знаний", included: true },
      { text: "Экспорт в PDF и Word", included: true },
      { text: "Журналы инструктажей", included: true },
      { text: "Уведомления о сроках", included: false },
      { text: "API интеграция", included: false },
      { text: "Выделенный менеджер", included: false },
      { text: "Корпоративная настройка", included: false },
    ],
  },
  {
    id: "business",
    name: "Бизнес",
    price: "12 900",
    period: "мес",
    description: "Для компаний от 50 до 500 сотрудников",
    icon: Building2,
    color: "border-blue-500 ring-2 ring-blue-500/20",
    headerBg: "bg-gradient-to-br from-blue-600 to-blue-700",
    badge: "Популярный",
    features: [
      { text: "До 500 сотрудников", included: true },
      { text: "Все шаблоны документов", included: true },
      { text: "Редактор под организацию", included: true },
      { text: "Поиск по базе знаний", included: true },
      { text: "Экспорт в PDF и Word", included: true },
      { text: "Журналы инструктажей", included: true },
      { text: "Уведомления о сроках", included: true },
      { text: "API интеграция", included: true },
      { text: "Выделенный менеджер", included: false },
      { text: "Корпоративная настройка", included: false },
    ],
  },
  {
    id: "enterprise",
    name: "Корпоративный",
    price: "По запросу",
    period: "",
    description: "Для крупных предприятий и холдингов",
    icon: Crown,
    color: "border-slate-200",
    headerBg: "bg-gradient-to-br from-slate-800 to-slate-900",
    badge: null,
    features: [
      { text: "Неограниченно сотрудников", included: true },
      { text: "Все шаблоны документов", included: true },
      { text: "Редактор под организацию", included: true },
      { text: "Поиск по базе знаний", included: true },
      { text: "Экспорт в PDF и Word", included: true },
      { text: "Журналы инструктажей", included: true },
      { text: "Уведомления о сроках", included: true },
      { text: "API интеграция", included: true },
      { text: "Выделенный менеджер", included: true },
      { text: "Корпоративная настройка", included: true },
    ],
  },
];

const ADVANTAGES = [
  { icon: FileText, title: "500+ шаблонов", desc: "Актуальная база документов, обновляемая при изменении законодательства" },
  { icon: ShieldCheck, title: "Соответствие законам", desc: "Все документы соответствуют требованиям ТК РФ, НПА и ГОСТ" },
  { icon: Clock, title: "Экономия времени", desc: "Настройка документа под компанию за 5 минут вместо 2 часов" },
  { icon: Users, title: "Поддержка 24/7", desc: "Команда экспертов по охране труда отвечает на вопросы" },
];

export function PlatformPage({ onLoginClick }: PlatformPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
      {/* Hero */}
      <section className="py-12 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Пробный период 14 дней бесплатно
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Тарифы на <span className="text-blue-600">ОхранаТруда.PRO</span>
          </h1>
          <p className="text-lg text-slate-500 mb-8">
            Выберите подходящий план для вашей организации. Начните с бесплатного пробного периода — менеджер свяжется с вами для настройки.
          </p>
        </div>
      </section>

      {/* Advantages */}
      <section className="pb-12 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          {ADVANTAGES.map((adv) => (
            <div key={adv.title} className="bg-white rounded-2xl border border-slate-100 p-5 text-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <adv.icon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1">{adv.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{adv.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isBusiness = plan.id === "business";
              return (
                <div
                  key={plan.id}
                  className={cn("bg-white rounded-2xl border overflow-hidden flex flex-col transition-all hover:shadow-xl", plan.color)}
                >
                  {/* Header */}
                  <div className={cn("p-6 relative", plan.headerBg, isBusiness ? "text-white" : "")}>
                    {plan.badge && (
                      <span className="absolute top-4 right-4 bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full border border-white/30">
                        {plan.badge}
                      </span>
                    )}
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", isBusiness ? "bg-white/20" : "bg-slate-100")}>
                      <Icon className={cn("w-5 h-5", isBusiness ? "text-white" : "text-slate-700")} />
                    </div>
                    <h3 className={cn("font-bold text-xl mb-1", isBusiness ? "text-white" : "text-slate-900")}>{plan.name}</h3>
                    <p className={cn("text-sm mb-4", isBusiness ? "text-blue-100" : "text-slate-500")}>{plan.description}</p>
                    <div className="flex items-end gap-1">
                      <span className={cn("text-3xl font-bold", isBusiness ? "text-white" : "text-slate-900")}>
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className={cn("text-sm mb-1", isBusiness ? "text-blue-100" : "text-slate-500")}>₽/{plan.period}</span>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="p-6 flex-1 flex flex-col">
                    <ul className="space-y-3 flex-1 mb-6">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm">
                          {f.included ? (
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <span className={f.included ? "text-slate-700" : "text-slate-400"}>{f.text}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.id === "enterprise" ? (
                      <a
                        href="mailto:sales@ohranatrud.pro"
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-colors"
                      >
                        Связаться с нами
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        onClick={onLoginClick}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 font-medium py-3 rounded-xl transition-colors",
                          isBusiness
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        )}
                      >
                        <Send className="w-4 h-4" />
                        Начать бесплатно
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 sm:p-12 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Не уверены в выборе тарифа?</h2>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            Войдите через Telegram — наш менеджер свяжется с вами, проведёт демонстрацию и подберёт оптимальное решение для вашей компании.
          </p>
          <button
            onClick={onLoginClick}
            className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
          >
            <Send className="w-4 h-4" />
            Получить консультацию через Telegram
          </button>
        </div>
      </section>
    </div>
  );
}
