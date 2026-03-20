import { ShieldCheck, Search, Download, Settings, Send, Building2, HardHat, Stethoscope, Factory, BookOpen, CheckCircle, ArrowRight } from "lucide-react";

interface AboutPageProps {
  onLoginClick: () => void;
}

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Search,
    title: "Ищете документ",
    desc: "Введите название документа, тип или ключевое слово. Умный поиск найдёт нужный шаблон за секунды из базы 500+ документов.",
  },
  {
    step: "02",
    icon: Download,
    title: "Скачиваете шаблон",
    desc: "Скачайте готовый шаблон бесплатно или получите доступ к полной базе документов на платформе.",
  },
  {
    step: "03",
    icon: Settings,
    title: "Настраиваете под организацию",
    desc: "В редакторе платформы укажите название компании, должности и реквизиты — документ готов за 5 минут.",
  },
  {
    step: "04",
    icon: CheckCircle,
    title: "Соответствуете закону",
    desc: "Используйте готовые документы в работе. Платформа следит за изменениями законодательства и уведомляет о необходимости обновления.",
  },
];

const FOR_WHOM = [
  { icon: Building2, label: "Руководители организаций", desc: "Выстройте систему ОТ без штатного специалиста" },
  { icon: HardHat, label: "Специалисты по охране труда", desc: "Ускорьте рутинную работу с документами в 10 раз" },
  { icon: Stethoscope, label: "HR и кадровые службы", desc: "Ведите журналы инструктажей и следите за обучением" },
  { icon: Factory, label: "Производственные предприятия", desc: "Полный комплект документации под любое производство" },
  { icon: BookOpen, label: "Учебные организации", desc: "Все документы для обучения по охране труда" },
  { icon: ShieldCheck, label: "Малый и средний бизнес", desc: "Доступная цена и быстрый старт без сложной настройки" },
];

const FAQ = [
  {
    q: "Документы соответствуют актуальному законодательству?",
    a: "Да. Все шаблоны разработаны и регулярно обновляются командой юристов и специалистов по охране труда в соответствии с ТК РФ, действующими ГОСТ и нормативными правовыми актами.",
  },
  {
    q: "Как происходит авторизация через Telegram?",
    a: "Вы вводите имя и номер телефона, получаете персональную ссылку на нашего Telegram-бота. После перехода с вами связывается менеджер для активации пробного доступа к полной платформе.",
  },
  {
    q: "Можно ли настроить документы под свою организацию?",
    a: "Да, это ключевая функция платформы. В редакторе вы указываете название организации, реквизиты, должности ответственных — и документ генерируется автоматически.",
  },
  {
    q: "Что входит в пробный период?",
    a: "Полный доступ ко всем функциям платформы на 14 дней без ограничений. После окончания пробного периода менеджер предложит подходящий тарифный план.",
  },
  {
    q: "Есть ли API для интеграции с нашей системой?",
    a: "Да, API доступен в тарифах Бизнес и Корпоративный. Вы можете интегрировать документы напрямую в вашу HR-систему или корпоративный портал.",
  },
];

export function AboutPage({ onLoginClick }: AboutPageProps) {
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white pt-24">
      {/* Hero */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <ShieldCheck className="w-3.5 h-3.5" />
            О платформе ОхранаТруда.PRO
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Всё что нужно для<br />
            <span className="text-blue-600">охраны труда</span> в одном месте
          </h1>
          <p className="text-lg text-slate-500">
            Мы создали платформу, которая помогает организациям любого размера выстроить документооборот по охране труда без ошибок, в разы быстрее и дешевле консультантов.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "500+", label: "шаблонов документов" },
              { value: "2 400+", label: "организаций доверяют" },
              { value: "14 дней", label: "бесплатный доступ" },
              { value: "98%", label: "соответствие законам" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5 text-center hover:shadow-md transition-shadow">
                <p className="text-2xl font-bold text-blue-600 mb-1">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 px-4 bg-slate-50/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Как это работает</h2>
            <p className="text-slate-500">От поиска до готового документа — за несколько минут</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-slate-200 z-0" style={{ width: "calc(100% - 2rem)" }}>
                    <ArrowRight className="w-4 h-4 text-slate-300 absolute right-0 -top-2" />
                  </div>
                )}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl font-black text-blue-100">{step.step}</span>
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For whom */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Для кого платформа</h2>
            <p className="text-slate-500">ОхранаТруда.PRO подходит любой организации</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FOR_WHOM.map((item) => (
              <div key={item.label} className="flex items-start gap-4 bg-white rounded-2xl border border-slate-100 p-5 hover:border-blue-100 hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">{item.label}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 px-4 bg-slate-50/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Частые вопросы</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <details key={i} className="group bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-slate-50 transition-colors">
                  <span className="font-semibold text-slate-900 text-sm pr-4">{item.q}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 sm:p-12 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Готовы начать?</h2>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            Войдите через Telegram — получите 14 дней бесплатного доступа к полной платформе. Никаких скрытых платежей.
          </p>
          <button
            onClick={onLoginClick}
            className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
          >
            <Send className="w-4 h-4" />
            Войти через Telegram и получить доступ
          </button>
        </div>
      </section>
    </div>
  );
}
