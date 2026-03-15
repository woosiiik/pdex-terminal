import type {
  PositionAnalysisRequest,
  PositionAnalysisResponse,
  FundingAnalysisResponse,
  OIAnalysisResponse,
  LiquidationAnalysisResponse,
  HealthResponse,
  ErrorResponse,
} from '@/lib/types';

const BASE_URL =
  process.env.NEXT_PUBLIC_WAS_URL ?? 'http://localhost:4000';

const TIMEOUT_MS = 10_000;

// ── Helpers ──────────────────────────────────────────────

async function post<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as ErrorResponse | null;
      throw new Error(
        err?.error?.message ?? `Analysis API error: ${res.status}`,
      );
    }

    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Analysis request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function get<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as ErrorResponse | null;
      throw new Error(
        err?.error?.message ?? `Analysis API error: ${res.status}`,
      );
    }

    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Analysis request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// ── API Functions ────────────────────────────────────────

export function analyzePosition(
  request: PositionAnalysisRequest,
): Promise<PositionAnalysisResponse> {
  return post<PositionAnalysisResponse>('/api/v1/analysis/position', {
    positions: request.positions,
    symbol: request.symbol,
  });
}

export function analyzeFunding(
  symbol: string,
): Promise<FundingAnalysisResponse> {
  return post<FundingAnalysisResponse>('/api/v1/analysis/funding', { symbol });
}

export function analyzeOI(symbol: string): Promise<OIAnalysisResponse> {
  return post<OIAnalysisResponse>('/api/v1/analysis/oi', { symbol });
}

export function analyzeLiquidation(
  symbol: string,
): Promise<LiquidationAnalysisResponse> {
  return post<LiquidationAnalysisResponse>('/api/v1/analysis/liquidation', {
    symbol,
  });
}

export function checkHealth(): Promise<HealthResponse> {
  return get<HealthResponse>('/api/v1/health');
}
