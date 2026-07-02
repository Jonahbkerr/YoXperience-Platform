import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "/dashboard/",
  resolve: {
    alias: {
      "@yoxperience/sdk": path.resolve(__dirname, "../sdk/src"),
    },
  },
  server: {
    port: 5174,
    fs: {
      allow: [".."],  // Allow imports from parent (sdk package)
    },
    proxy: {
      "/auth": {
        target: "http://localhost:3457",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:3457",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:3457",
        changeOrigin: true,
      },
      "/v1": {
        target: "http://localhost:3457",
        changeOrigin: true,
      },
    },
  },
});
