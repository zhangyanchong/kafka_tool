import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // Source files have tracked JavaScript artifacts from an older type-check.
    // Prefer the maintained TypeScript modules for extensionless imports.
    extensions: [".ts", ".tsx", ".mjs", ".js", ".mts", ".jsx", ".json"],
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:18080",
    },
  },
});
