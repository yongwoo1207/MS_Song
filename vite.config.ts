import { defineConfig, Plugin, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type express from "express";
import { createServer } from "./server";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), expressPlugin()],
  server: {
    host: "::",
    port: 8080,
    // Posts API runs in the Cloudflare Worker (`npm run dev:api`, port 8787)
    proxy: {
      "/api/posts": "http://127.0.0.1:8787",
      "/api/events": "http://127.0.0.1:8787",
      "/api/song-counts": "http://127.0.0.1:8787",
      "/api/me": "http://127.0.0.1:8787",
      "/api/notifications": "http://127.0.0.1:8787",
    },
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        path.resolve(__dirname, "."),       // 프로젝트 루트
        path.resolve(__dirname, "client"),
        path.resolve(__dirname, "shared"),
      ],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  build: { outDir: "dist/spa" },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createServer();

      // Add Express app as middleware to Vite dev server. The posts API
      // belongs to the Worker: skip it so the dev proxy gets it.
      server.middlewares.use((req, res, next) =>
        /^\/api\/(posts|events|song-counts|me|notifications)(\/|\?|$)/.test(req.url ?? "")
          ? next()
          : app(req as express.Request, res as express.Response, next),
      );
    },
  };
}
