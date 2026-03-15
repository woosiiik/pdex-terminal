import { Router } from "express";
import type { Request, Response } from "express";
import { validate, positionAnalysisRequestSchema, symbolRequestSchema } from "../validators/index.js";
import {
  analyzePosition,
  analyzeFundingStandalone,
  analyzeOIStandalone,
  analyzeLiquidationStandalone,
} from "../orchestrator/index.js";
import { getRedis } from "../data/cache.js";
import { getPool } from "../data/db.js";

const router = Router();

// ============================================================
// POST /api/v1/analysis/position
// ============================================================

router.post(
  "/analysis/position",
  validate(positionAnalysisRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { positions, symbol } = req.body;
      const result = await analyzePosition(positions, symbol);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  },
);

// ============================================================
// POST /api/v1/analysis/funding
// ============================================================

router.post(
  "/analysis/funding",
  validate(symbolRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { symbol } = req.body;
      const result = await analyzeFundingStandalone(symbol);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  },
);

// ============================================================
// POST /api/v1/analysis/oi
// ============================================================

router.post(
  "/analysis/oi",
  validate(symbolRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { symbol } = req.body;
      const result = await analyzeOIStandalone(symbol);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  },
);

// ============================================================
// POST /api/v1/analysis/liquidation
// ============================================================

router.post(
  "/analysis/liquidation",
  validate(symbolRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { symbol } = req.body;
      const result = await analyzeLiquidationStandalone(symbol);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  },
);

// ============================================================
// GET /api/v1/health
// ============================================================

router.get("/health", async (_req: Request, res: Response): Promise<void> => {
  const services: Record<string, string> = {
    redis: "disconnected",
    mysql: "disconnected",
    hyperliquid: "unknown",
  };

  try {
    await getRedis().ping();
    services.redis = "connected";
  } catch { /* ignore */ }

  try {
    await getPool().execute("SELECT 1");
    services.mysql = "connected";
  } catch { /* ignore */ }

  try {
    const hlRes = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "meta" }),
      signal: AbortSignal.timeout(10000),
    });
    services.hyperliquid = hlRes.ok ? "reachable" : "unreachable";
  } catch (err) {
    console.error("Hyperliquid health check failed:", err);
    services.hyperliquid = "unreachable";
  }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services,
  });
});

// ============================================================
// Error handler helper
// ============================================================

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : "Unknown error";

  if (message.includes("timeout")) {
    res.status(504).json({
      success: false,
      error: { code: "ANALYSIS_TIMEOUT", message: "분석 타임아웃 (10초 초과)" },
    });
    return;
  }

  if (message.includes("Market data unavailable")) {
    res.status(503).json({
      success: false,
      error: { code: "MARKET_DATA_UNAVAILABLE", message: "마켓 데이터를 조회할 수 없습니다" },
    });
    return;
  }

  console.error("Internal error:", err);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "내부 처리 오류가 발생했습니다" },
  });
}

export default router;
