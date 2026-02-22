import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRouter from "./routes/auth.js";
import { errorHandler } from "./middleware/error-handler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Middleware
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["http://localhost:5173", "http://localhost:5174"];

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // API routes
  app.use("/auth", authRouter);

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "yoxperience-gateway" });
  });

  // Production static serving
  if (process.env.NODE_ENV === "production") {
    const dashboardDir = path.resolve(__dirname, "../../dashboard/dist");
    const landingDir = path.resolve(__dirname, "../../landing/dist");

    // Dashboard SPA at /dashboard/*
    app.use("/dashboard", express.static(dashboardDir));
    app.get("/dashboard/*", (_req, res) => {
      res.sendFile(path.join(dashboardDir, "index.html"));
    });

    // Landing page at /*
    app.use(express.static(landingDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(landingDir, "index.html"));
    });
  }

  // Error handler
  app.use(errorHandler);

  return app;
}
