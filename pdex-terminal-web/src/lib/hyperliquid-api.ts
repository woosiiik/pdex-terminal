const BASE_URL =
  process.env.NEXT_PUBLIC_HL_API_URL ?? 'https://api.hyperliquid.xyz';

async function postInfo<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE_URL}/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Hyperliquid API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ── Clearinghouse State ────────────────────────────────────
export interface HLClearinghouseState {
  marginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
  };
  crossMarginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
  };
  assetPositions: {
    type: string;
    position: {
      coin: string;
      szi: string;
      leverage: { type: string; value: number };
      entryPx: string;
      positionValue: string;
      unrealizedPnl: string;
      returnOnEquity: string;
      liquidationPx: string | null;
      marginUsed: string;
    };
  }[];
}

export function getClearinghouseState(
  address: string,
): Promise<HLClearinghouseState> {
  return postInfo<HLClearinghouseState>({
    type: 'clearinghouseState',
    user: address,
  });
}


// ── Open Orders ────────────────────────────────────────────
export interface HLOpenOrder {
  coin: string;
  side: 'A' | 'B'; // A = sell, B = buy
  limitPx: string;
  sz: string;
  oid: number;
  timestamp: number;
  orderType: string;
}

export function getOpenOrders(address: string): Promise<HLOpenOrder[]> {
  return postInfo<HLOpenOrder[]>({ type: 'openOrders', user: address });
}

// ── Candle Snapshot ────────────────────────────────────────
export interface HLCandle {
  t: number; // open time
  T: number; // close time
  s: string; // coin
  i: string; // interval
  o: string; // open
  c: string; // close
  h: string; // high
  l: string; // low
  v: string; // volume
  n: number; // number of trades
}

export function getCandleSnapshot(
  coin: string,
  interval: string,
  startTime: number,
  endTime: number,
): Promise<HLCandle[]> {
  return postInfo<HLCandle[]>({
    type: 'candleSnapshot',
    req: { coin, interval, startTime, endTime },
  });
}

// ── Funding History ────────────────────────────────────────
export interface HLFundingEntry {
  coin: string;
  fundingRate: string;
  premium: string;
  time: number;
}

export function getFundingHistory(
  coin: string,
  startTime: number,
  endTime?: number,
): Promise<HLFundingEntry[]> {
  return postInfo<HLFundingEntry[]>({
    type: 'fundingHistory',
    coin,
    startTime,
    ...(endTime !== undefined && { endTime }),
  });
}

// ── Meta ───────────────────────────────────────────────────
export interface HLMeta {
  universe: {
    name: string;
    szDecimals: number;
    maxLeverage: number;
    onlyIsolated: boolean;
  }[];
}

export function getMeta(): Promise<HLMeta> {
  return postInfo<HLMeta>({ type: 'meta' });
}

// ── All Mids ───────────────────────────────────────────────
export function getAllMids(): Promise<Record<string, string>> {
  return postInfo<Record<string, string>>({ type: 'allMids' });
}

// ── L2 Book ────────────────────────────────────────────────
export interface HLL2Book {
  levels: [
    { px: string; sz: string; n: number }[], // bids
    { px: string; sz: string; n: number }[], // asks
  ];
}

export function getL2Book(coin: string): Promise<HLL2Book> {
  return postInfo<HLL2Book>({ type: 'l2Book', coin });
}
