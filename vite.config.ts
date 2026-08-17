import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "index",
      cssFileName: "oauth"
    },
    rollupOptions: {
      external: ["oidc-client-ts", "react", "react-dom", "react/jsx-runtime"],
      output: {
        /*
         * Пакет целиком клиентский: контекст, хуки и обработчики событий.
         * Без директивы в собранном бандле импорт из серверного компонента
         * Next.js App Router падает на `createContext is not a function` —
         * потребителю приходилось бы оборачивать кнопку в свой 'use client'.
         */
        banner: '"use client";'
      }
    },
    sourcemap: true
  }
});
