import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthModal } from "@/components/AuthModal";
import { HomePage } from "@/pages/HomePage";
import { PlatformPage } from "@/pages/PlatformPage";
import { AboutPage } from "@/pages/AboutPage";
import { ArchitecturePage } from "@/pages/ArchitecturePage";
import { useAuth } from "@/hooks/useAuth";
import type { ModalMode } from "@/types/auth";

export function App() {
  const auth = useAuth();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [defaultMode, setDefaultMode] = useState<ModalMode>("login");

  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const openModal = (mode: ModalMode = "login") => {
    setDefaultMode(mode);
    setShowAuthModal(true);
  };

  const handleCloseModal = () => {
    setShowAuthModal(false);
    auth.resetPollStatus();
  };

  const handleFavoriteToggle = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleSearch = (query: string) => {
    if (auth.user) {
      setSearchHistory((prev) => {
        const filtered = prev.filter((q) => q !== query);
        return [...filtered, query].slice(-10);
      });
    }
  };

  const handleLogout = () => {
    auth.logout();
    setFavorites([]);
    setSearchHistory([]);
  };

  // Пока восстанавливаем сессию — ничего не показываем
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar
          user={auth.user}
          onLoginClick={() => openModal("login")}
          onRegisterClick={() => openModal("register")}
          onLogout={handleLogout}
        />

        <main className="flex-1">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  user={auth.user}
                  favorites={favorites}
                  onFavoriteToggle={handleFavoriteToggle}
                  onLoginRequired={() => openModal("login")}
                  searchHistory={searchHistory}
                  onSearch={handleSearch}
                />
              }
            />
            <Route
              path="/platform"
              element={
                <PlatformPage onLoginClick={() => openModal("register")} />
              }
            />
            <Route
                path="/about"
                element={
                  <AboutPage onLoginClick={() => openModal("register")} />
                }
            />
            <Route
                path="/dev/architecture"
                element={<ArchitecturePage />}
            />
            <Route
              path="*"
              element={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <p className="text-6xl font-black text-slate-100 mb-4">
                      404
                    </p>
                    <p className="text-slate-500 mb-4">Страница не найдена</p>
                    <a
                      href="/"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      ← На главную
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
        </main>

        <Footer />

        {showAuthModal && (
          <AuthModal
            onClose={handleCloseModal}
            onPollingStart={auth.startPolling}
            pollStatus={auth.pollStatus}
            defaultMode={defaultMode}
          />
        )}
      </div>
    </BrowserRouter>
  );
}
