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
      external: ["oidc-client-ts", "react", "react-dom", "react/jsx-runtime"]
    },
    sourcemap: true
  }
});
