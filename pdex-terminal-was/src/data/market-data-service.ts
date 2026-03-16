import { config } from "../config/index.js";
import { cacheGet, cacheSet, cacheKey } from "./cache.js";
import * as hl from "./hyperliquid-client.js";
import type { CandleData, FundingRateEntry, OIData, MarketMeta, DataFreshness } from "../types/index.js";

interface CachedResult<T> {
  data: T;
  freshness: DataFreshness;
}

async function fetchWithCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<CachedResult<T>> {
  // Try cache first
  const cached = await cacheGet<T>(key);

  try {
    const data = await fetcher();
    await cacheSet(key, data, ttl);
    return { data, freshness: { source: "live" } };
  } catch {
    // API failed, try cache fallback
    if (cached) {
      return {
        data: cached.data,
        freshness: { source: "cached", cachedAt: cached.cachedAt },
      };
    }
    throw new Error("Market data unavailable: API failed and no cache");
  }
}

export async function getPrice(symbol: string): Promise<CachedResult<number>> {
  return fetchWithCache(
    cacheKey("price", symbol),
    config.cacheTTL.price,
    () => hl.getPrice(symbol),
  );
}

export async function getCandles(
  symbol: string,
  interval: string,
  days: number,
): Promise<CachedResult<CandleData[]>> {
  const endTime = Date.now();
  const startTime = endTime - days * 24 * 60 * 60 * 1000;
  return fetchWithCache(
    cacheKey("candles", symbol, interval, String(days)),
    config.cacheTTL.candles,
    () => hl.getCandles(symbol, interval, startTime, endTime),
  );
}

export async function getFundingRate(symbol: string): Promise<CachedResult<number>> {
  return fetchWithCache(
    cacheKey("funding", symbol),
    config.cacheTTL.funding,
    () => hl.getFundingRate(symbol),
  );
}

export async function getFundingHistory(
  symbol: string,
  days: number,
): Promise<CachedResult<FundingRateEntry[]>> {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
  return fetchWithCache(
    cacheKey("fundingHistory", symbol, String(days)),
    config.cacheTTL.funding,
    () => hl.getFundingHistory(symbol, startTime),
  );
}

export async function getOpenInterest(symbol: string): Promise<CachedResult<OIData>> {
  return fetchWithCache(
    cacheKey("oi", symbol),
    config.cacheTTL.oi,
    () => hl.getOpenInterest(symbol),
  );
}

export async function getMarketMeta(): Promise<CachedResult<MarketMeta>> {
  return fetchWithCache(
    cacheKey("meta"),
    config.cacheTTL.meta,
    () => hl.getMarketMeta(),
  );
}

export async function getL2Book(symbol: string): Promise<CachedResult<import("../types/index.js").L2Book>> {
  return fetchWithCache(
    cacheKey("l2book", symbol),
    config.cacheTTL.price, // short TTL like price
    async () => {
      const raw = await hl.getL2Book(symbol);
      return {
        bids: raw.bids.map((l) => ({ price: parseFloat(l.px), size: parseFloat(l.sz) })),
        asks: raw.asks.map((l) => ({ price: parseFloat(l.px), size: parseFloat(l.sz) })),
      };
    },
  );
}
