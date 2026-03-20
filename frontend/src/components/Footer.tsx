import { Link } from "react-router-dom";
import { ShieldCheck, Send, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight">
                <span className="font-bold text-white text-base">ОхранаТруда</span>
                <span className="font-bold text-blue-400 text-base">.PRO</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed">
              SaaS-платформа справочных материалов по охране труда для организаций любого размера.
            </p>
          </div>

          {/* Nav */}
          <div>
            <h4 className="font-semibold text-white text-sm mb-3">Сервис</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Документы</Link></li>
              <li><Link to="/platform" className="hover:text-white transition-colors">Тарифы</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">О платформе</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white text-sm mb-3">Документы</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="hover:text-white transition-colors cursor-pointer">Инструкции по ОТ</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Журналы инструктажей</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Приказы и распоряжения</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Акты расследования</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Положения СУОТ</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white text-sm mb-3">Контакты</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <a href="mailto:Cot-ufa@yandex.ru" className="hover:text-white transition-colors">Cot-ufa@yandex.ru</a>
              </li>
              <li className="flex items-center gap-2">
                <Send className="w-3.5 h-3.5 shrink-0" />
                <a href="https://t.me/safeworkhub_bot" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">@safeworkhub_bot</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs">© 2025 ОхранаТруда.PRO. Все права защищены.</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="hover:text-white transition-colors cursor-pointer">Политика конфиденциальности</span>
            <span className="hover:text-white transition-colors cursor-pointer">Условия использования</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
