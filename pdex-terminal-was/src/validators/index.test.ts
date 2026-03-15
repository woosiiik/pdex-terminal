import { describe, it, expect, vi } from "vitest";
import {
  PositionAnalysisRequestSchema,
  FundingAnalysisRequestSchema,
  OIAnalysisRequestSchema,
  LiquidationAnalysisRequestSchema,
  validate,
} from "./index.js";
import type { Request, Response, NextFunction } from "express";

// ============================================================
// Helper: valid position fixture
// ============================================================

const validPosition = {
  coin: "BTC",
  side: "long" as const,
  entryPrice: 50000,
  size: 1,
  leverage: 10,
  liquidationPrice: 45000,
  marginUsed: 5000,
};

// ============================================================
// PositionAnalysisRequestSchema
// ============================================================

describe("PositionAnalysisRequestSchema", () => {
  it("accepts a valid request", () => {
    const result = PositionAnalysisRequestSchema.safeParse({
      positions: [validPosition],
      symbol: "BTC",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty positions array", () => {
    const result = PositionAnalysisRequestSchema.safeParse({
      positions: [],
      symbol: "BTC",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing symbol", () => {
    const result = PositionAnalysisRequestSchema.safeParse({
      positions: [validPosition],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty symbol", () => {
    const result = PositionAnalysisRequestSchema.safeParse({
      positions: [validPosition],
      symbol: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects position with negative entryPrice", () => {
    const result = PositionAnalysisRequestSchema.safeParse({
      positions: [{ ...validPosition, entryPrice: -1 }],
      symbol: "BTC",
    });
    expect(result.success).toBe(false);
  });

  it("rejects position with zero size", () => {
    const result = PositionAnalysisRequestSchema.safeParse({
      positions: [{ ...validPosition, size: 0 }],
      symbol: "BTC",
    });
    expect(result.success).toBe(false);
  });

  it("rejects position with leverage < 1", () => {
    const result = PositionAnalysisRequestSchema.safeParse({
      positions: [{ ...validPosition, leverage: 0.5 }],
      symbol: "BTC",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid side value", () => {
    const result = PositionAnalysisRequestSchema.safeParse({
      positions: [{ ...validPosition, side: "neutral" }],
      symbol: "BTC",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// FundingAnalysisRequestSchema
// ============================================================

describe("FundingAnalysisRequestSchema", () => {
  it("accepts a valid request", () => {
    const result = FundingAnalysisRequestSchema.safeParse({ symbol: "ETH" });
    expect(result.success).toBe(true);
  });

  it("rejects empty symbol", () => {
    const result = FundingAnalysisRequestSchema.safeParse({ symbol: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing symbol", () => {
    const result = FundingAnalysisRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ============================================================
// OIAnalysisRequestSchema
// ============================================================

describe("OIAnalysisRequestSchema", () => {
  it("accepts a valid request", () => {
    const result = OIAnalysisRequestSchema.safeParse({ symbol: "SOL" });
    expect(result.success).toBe(true);
  });

  it("rejects missing symbol", () => {
    const result = OIAnalysisRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ============================================================
// LiquidationAnalysisRequestSchema
// ============================================================

describe("LiquidationAnalysisRequestSchema", () => {
  it("accepts a valid request", () => {
    const result = LiquidationAnalysisRequestSchema.safeParse({ symbol: "BTC" });
    expect(result.success).toBe(true);
  });

  it("rejects missing symbol", () => {
    const result = LiquidationAnalysisRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ============================================================
// validate middleware
// ============================================================

describe("validate middleware", () => {
  function mockReqResNext(body: unknown) {
    const req = { body } as Request;
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status, json } as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { req, res, status, json, next };
  }

  it("calls next() on valid input", () => {
    const middleware = validate(PositionAnalysisRequestSchema);
    const { req, res, next } = mockReqResNext({
      positions: [validPosition],
      symbol: "BTC",
    });

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("returns 400 with ErrorResponse on invalid input", () => {
    const middleware = validate(PositionAnalysisRequestSchema);
    const { req, res, status, json, next } = mockReqResNext({
      positions: [],
      symbol: "",
    });

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "VALIDATION_ERROR",
          message: "요청 본문이 유효하지 않습니다",
          details: expect.any(Object),
        }),
      })
    );
  });
});
