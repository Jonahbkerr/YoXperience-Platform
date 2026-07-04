import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRouter from "./routes/auth.js";
import organizationsRouter from "./routes/organizations.js";
import projectsRouter from "./routes/projects.js";
import apiKeysRouter from "./routes/api-keys.js";
import slotsRouter from "./routes/slots.js";
import analyticsRouter from "./routes/analytics.js";
import sdkRouter from "./routes/sdk.js";
import analyzeRouter from "./routes/analyze.js";
import { errorHandler } from "./middleware/error-handler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const START_TIME = Date.now();

export function createApp() {
  const app = express();

  // Middleware
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["http://localhost:5173", "http://localhost:5174"];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (corsOrigins.includes(origin)) return callback(null, true);
        callback(null, true);
      },
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // API routes
  app.use("/auth", authRouter);
  app.use("/api/organizations", organizationsRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/projects/:projectId/keys", apiKeysRouter);
  app.use("/api/projects/:projectId/slots", slotsRouter);
  app.use("/api/projects/:projectId/analytics", analyticsRouter);

  // SDK routes (API key auth, not JWT)
  app.use("/v1", sdkRouter);
  app.use("/v1", analyzeRouter);

  // Public liveness probe. Tenant details (project names, per-project
  // counts) are intentionally not exposed here — use the authed dashboard
  // APIs for that data.
  app.get("/health", async (_req, res) => {
    try {
      const { pool } = await import("./db/client.js");
      const eventsRes = await pool.query("SELECT count(*)::int as count FROM telemetry_events");
      res.json({
        status: "ok",
        service: "yoxperience-gateway",
        db: { events: eventsRes.rows[0].count },
        experimentsEnabled: process.env.EXPERIMENTS_ENABLED !== "false",
      });
    } catch (err: any) {
      res.status(503).json({ status: "degraded", service: "yoxperience-gateway", dbError: err.message });
    }
  });

  // Public metrics endpoint (used by fleet health monitoring)
  app.get("/api/metrics", async (_req, res) => {
    try {
      const { pool } = await import("./db/client.js");
      const eventsRes = await pool.query("SELECT count(*)::int as count FROM telemetry_events");
      const slotsRes = await pool.query("SELECT count(*)::int as count FROM slot_definitions");
      const keysRes = await pool.query("SELECT count(*)::int as count FROM api_keys");
      const projectsRes = await pool.query("SELECT count(*)::int as count FROM projects");
      res.json({
        service: "yoxperience-gateway",
        status: "ok",
        uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
        projects: projectsRes.rows[0].count,
        api_keys: keysRes.rows[0].count,
        slot_definitions: slotsRes.rows[0].count,
        telemetry_events: eventsRes.rows[0].count,
      });
    } catch (err: any) {
      res.json({
        service: "yoxperience-gateway",
        status: "degraded",
        uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
        db_error: err.message,
      });
    }
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
