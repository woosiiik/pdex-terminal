// Allow self-signed certificates in local dev (Hyperliquid API)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import express from "express";
import { config } from "./config/index.js";
import apiRouter from "./api/index.js";
import { getRedis } from "./data/cache.js";
import { runMigrations } from "./data/db.js";

const app = express();

// Middleware
app.use(express.json({ limit: "1mb" }));

// CORS (permissive for MVP)
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// Routes
app.use("/api/v1", apiRouter);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "내부 처리 오류가 발생했습니다" },
  });
});

// Startup
async function start(): Promise<void> {
  // Connect Redis
  try {
    await getRedis().connect();
    console.log("Redis connected");
  } catch (err) {
    console.warn("Redis connection failed, continuing without cache:", err);
  }

  // Run DB migrations
  try {
    await runMigrations();
    console.log("DB migrations complete");
  } catch (err) {
    console.warn("DB migration failed, continuing without persistence:", err);
  }

  app.listen(config.port, () => {
    console.log(`PDEX Analysis Server running on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
