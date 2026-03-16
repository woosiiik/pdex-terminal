import { config } from "../config/index.js";
import type { CandleData, FundingRateEntry, OIData, MarketMeta } from "../types/index.js";

const BASE_URL = config.hyperliquid.apiUrl;

async function postInfo(body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Hyperliquid API error: ${res.status}`);
  return res.json();
}

export async function getPrice(symbol: string): Promise<number> {
  const data = await postInfo({ type: "allMids" }) as Record<string, string>;
  const mid = data[symbol];
  if (!mid) throw new Error(`No price data for ${symbol}`);
  return parseFloat(mid);
}

export async function getCandles(
  symbol: string,
  interval: string,
  startTime: number,
  endTime: number,
): Promise<CandleData[]> {
  const data = await postInfo({
    type: "candleSnapshot",
    req: { coin: symbol, interval, startTime, endTime },
  }) as Array<{ t: number; o: string; h: string; l: string; c: string; v: string }>;

  return data.map((c) => ({
    timestamp: c.t,
    open: parseFloat(c.o),
    high: parseFloat(c.h),
    low: parseFloat(c.l),
    close: parseFloat(c.c),
    volume: parseFloat(c.v),
  }));
}

export async function getFundingRate(symbol: string): Promise<number> {
  const data = await postInfo({ type: "metaAndAssetCtxs" }) as [MarketMeta, Array<{ funding: string }>];
  const meta = data[0];
  const ctxs = data[1];
  const idx = meta.universe.findIndex((u) => u.name === symbol);
  if (idx === -1) throw new Error(`No funding data for ${symbol}`);
  return parseFloat(ctxs[idx].funding);
}

export async function getFundingHistory(
  symbol: string,
  startTime: number,
  endTime?: number,
): Promise<FundingRateEntry[]> {
  const data = await postInfo({
    type: "fundingHistory",
    coin: symbol,
    startTime,
    endTime: endTime || Date.now(),
  }) as Array<{ coin: string; fundingRate: string; time: number }>;

  return data.map((d) => ({
    coin: d.coin,
    rate: parseFloat(d.fundingRate),
    timestamp: d.time,
  }));
}

export async function getOpenInterest(symbol: string): Promise<OIData> {
  const data = await postInfo({ type: "metaAndAssetCtxs" }) as [MarketMeta, Array<{ openInterest: string }>];
  const meta = data[0];
  const ctxs = data[1];
  const idx = meta.universe.findIndex((u) => u.name === symbol);
  if (idx === -1) throw new Error(`No OI data for ${symbol}`);
  return {
    coin: symbol,
    openInterest: parseFloat(ctxs[idx].openInterest),
    timestamp: Date.now(),
  };
}

export async function getMarketMeta(): Promise<MarketMeta> {
  const data = await postInfo({ type: "meta" }) as MarketMeta;
  return data;
}

export async function getL2Book(symbol: string, nSigFigs: number = 5): Promise<{ bids: Array<{ px: string; sz: string }>; asks: Array<{ px: string; sz: string }> }> {
  const data = await postInfo({ type: "l2Book", coin: symbol, nSigFigs }) as { levels: Array<Array<{ px: string; sz: string; n: number }>> };
  return {
    bids: (data.levels[0] ?? []).map((l) => ({ px: l.px, sz: l.sz })),
    asks: (data.levels[1] ?? []).map((l) => ({ px: l.px, sz: l.sz })),
  };
}
