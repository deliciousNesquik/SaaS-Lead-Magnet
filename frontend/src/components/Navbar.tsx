import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  Menu,
  X,
  Star,
  LogIn,
  LogOut,
  User as UserIcon,
  UserPlus,
} from "lucide-react";
import { cn } from "@/utils/cn";
import type { User } from "@/types/auth";

interface NavbarProps {
  user: User | null;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLogout: () => void;
}

export function Navbar({ user, onLoginClick, onRegisterClick, onLogout }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const links = [
    { href: "/", label: "Документы" },
    { href: "/platform", label: "Платформа" },
    { href: "/about", label: "О сервисе" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-linear-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-200 group-hover:shadow-blue-300 transition-shadow">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-slate-900 text-base">
                Охрана Труда
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === link.href
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              /* ── Авторизован ── */
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-amber-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-amber-50">
                  <Star className="w-4 h-4" />
                  Избранное
                </button>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 text-xs font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="leading-tight">
                    <p className="text-xs font-semibold text-slate-800">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-slate-400">{user.phone}</p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="ml-1 w-6 h-6 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                    title="Выйти"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* ── Не авторизован ── */
              <div className="flex items-center gap-2">
                <button
                  onClick={onLoginClick}
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Войти
                </button>
                <button
                  onClick={onRegisterClick}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm shadow-blue-200"
                >
                  <UserPlus className="w-4 h-4" />
                  Регистрация
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location.pathname === link.href
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            {user ? (
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-400">{user.phone}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    setMenuOpen(false);
                  }}
                  className="text-sm text-red-500 font-medium"
                >
                  Выйти
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    onLoginClick();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Войти
                </button>
                <button
                  onClick={() => {
                    onRegisterClick();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Регистрация
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
