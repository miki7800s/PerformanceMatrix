import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@components": "/src/components",
    },
  },
  cacheDir: "node_modules/.vite",
  server: {
    host: "127.0.0.1",
    fs: {
      strict: true,
      allow: [process.cwd()],
    },
  },
});
