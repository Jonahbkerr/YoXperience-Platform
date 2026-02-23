import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/dashboard/",
  server: {
    port: 5174,
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
    },
  },
});
