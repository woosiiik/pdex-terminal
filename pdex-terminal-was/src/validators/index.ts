import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

// ============================================================
// Zod Schemas
// ============================================================

const openOrderSchema = z.object({
  coin: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  type: z.enum(["limit", "market"]),
  price: z.number().positive(),
  size: z.number().positive(),
  timestamp: z.number(),
});

const openPositionSchema = z.object({
  coin: z.string().min(1),
  side: z.enum(["long", "short"]),
  entryPrice: z.number().positive(),
  size: z.number().positive(),
  leverage: z.number().min(1),
  liquidationPrice: z.number().min(0),
  marginUsed: z.number().min(0),
});

export const positionAnalysisRequestSchema = z.object({
  positions: z.array(openPositionSchema).min(1, "최소 1개의 포지션이 필요합니다"),
  symbol: z.string().min(1, "심볼은 필수 항목입니다"),
  userAddress: z.string().optional(),
  exchange: z.string().optional(),
});

export const symbolRequestSchema = z.object({
  symbol: z.string().min(1, "심볼은 필수 항목입니다"),
});

export const orderAnalysisRequestSchema = z.object({
  orders: z.array(openOrderSchema).min(1, "최소 1개의 주문이 필요합니다"),
  positions: z.array(openPositionSchema).default([]),
  symbol: z.string().min(1, "심볼은 필수 항목입니다"),
});

// ============================================================
// Validation Middleware
// ============================================================

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        details[path || "_root"] = issue.message;
      }
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "요청 본문이 유효하지 않습니다",
          details,
        },
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
