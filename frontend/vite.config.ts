import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// https://vite.dev/config/

export default defineConfig({
  // base "/" — все пути будут от корня, не от /frontend/
  base: "/",
  // Явно указываем корень проекта — папка где лежит index.html
  root: __dirname,
  // Папка со статичными файлами (favicon, og-image и т.д.)
  publicDir: path.resolve(__dirname, "public"),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // @ → src/ (работает из любой директории запуска)
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Куда складывать собранные файлы
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  // ── Proxy для разработки ──────────────────────────────────────
  // Все запросы /api/* → http://localhost:3001/api/*
  // Так фронт и backend работают на разных портах без CORS проблем
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        // Не убираем /api — backend слушает /api/*
        secure: false,
        // Показываем в консоли проксированные запросы
        configure: (proxy) => {
          proxy.on("proxyReq", (_proxyReq, req) => {
            console.log(`[proxy] ${req.method} ${req.url} → :3001`);
          });
        },
      },
    },
  },
});