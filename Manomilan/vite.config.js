import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL(".", import.meta.url)), "VITE_");
  const proxyToBackend = () => ({
    target: env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000",
    changeOrigin: true,
    xfwd: true,
  });

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": proxyToBackend(),
        "/storage": proxyToBackend(),
        "/uploads": proxyToBackend(),
      },
    },
  };
});
