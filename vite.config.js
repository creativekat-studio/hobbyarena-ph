import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxy = env.VITE_API_PROXY || "http://localhost:3000";

  return {
    plugins: [react()],
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        react: path.resolve(rootDir, "node_modules/react"),
        "react-dom": path.resolve(rootDir, "node_modules/react-dom"),
      },
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-colorful"],
    },
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        "/api": {
          target: apiProxy,
          changeOrigin: true,
        },
      },
    },
  };
});
