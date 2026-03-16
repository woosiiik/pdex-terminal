'use client';

import { useEffect, useRef } from 'react';
import { HyperliquidWS } from '@/lib/hyperliquid-ws';
import { useStore } from '@/stores/useStore';
import type { Position, Order, CandleData, OrderbookLevel, ActiveAssetCtx } from '@/lib/types';

// ── Helpers to parse Hyperliquid WS payloads ─────────────

function parsePositions(
  assetPositions: Array<{
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
  }>,
  mids: Record<string, string>,
): Position[] {
  return assetPositions
    .filter((ap) => parseFloat(ap.position.szi) !== 0)
    .map((ap) => {
      const p = ap.position;
      const size = parseFloat(p.szi);
      const entryPrice = parseFloat(p.entryPx);
      const currentPrice = parseFloat(mids[p.coin] ?? p.entryPx);
      const unrealizedPnl = parseFloat(p.unrealizedPnl);
      const marginUsed = parseFloat(p.marginUsed);
      const pnlPercent = marginUsed !== 0 ? (unrealizedPnl / marginUsed) * 100 : 0;

      return {
        coin: p.coin,
        side: size > 0 ? 'long' : 'short',
        entryPrice,
        currentPrice,
        size: Math.abs(size),
        leverage: p.leverage.value,
        unrealizedPnl,
        pnlPercent,
        liquidationPrice: p.liquidationPx ? parseFloat(p.liquidationPx) : 0,
        marginUsed,
      } satisfies Position;
    });
}

function parseOrders(
  openOrders: Array<{
    coin: string;
    side: 'A' | 'B';
    limitPx: string;
    sz: string;
    timestamp: number;
    orderType: string;
  }>,
): Order[] {
  return openOrders.map((o) => ({
    coin: o.coin,
    type: o.orderType === 'Limit' ? 'limit' : 'market',
    side: o.side === 'B' ? 'buy' : 'sell',
    price: parseFloat(o.limitPx),
    size: parseFloat(o.sz),
    timestamp: o.timestamp,
  }));
}

function parseL2Book(
  levels: [
    Array<{ px: string; sz: string; n: number }>,
    Array<{ px: string; sz: string; n: number }>,
  ],
): { bids: OrderbookLevel[]; asks: OrderbookLevel[] } {
  const mapLevels = (
    raw: Array<{ px: string; sz: string; n: number }>,
  ): OrderbookLevel[] => {
    let cumulative = 0;
    return raw.map((l) => {
      const size = parseFloat(l.sz);
      cumulative += size;
      return { price: parseFloat(l.px), size, cumulative };
    });
  };
  return { bids: mapLevels(levels[0]), asks: mapLevels(levels[1]) };
}

function parseCandle(raw: {
  t: number;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
}): CandleData {
  return {
    timestamp: raw.t,
    open: parseFloat(raw.o),
    high: parseFloat(raw.h),
    low: parseFloat(raw.l),
    close: parseFloat(raw.c),
    volume: parseFloat(raw.v),
  };
}

// ── Hook ─────────────────────────────────────────────────

export function useWebSocket(walletAddress: string | null): void {
  const wsRef = useRef<HyperliquidWS | null>(null);
  const selectedCoin = useStore((s) => s.selectedCoin);

  const setPositions = useStore((s) => s.setPositions);
  const setOrders = useStore((s) => s.setOrders);
  const setAllMids = useStore((s) => s.setAllMids);
  const setOrderbook = useStore((s) => s.setOrderbook);
  const setCandles = useStore((s) => s.setCandles);
  const setAccountSummary = useStore((s) => s.setAccountSummary);
  const setActiveAssetCtx = useStore((s) => s.setActiveAssetCtx);

  // Connect / disconnect based on walletAddress
  useEffect(() => {
    if (!walletAddress) {
      wsRef.current?.disconnect();
      wsRef.current = null;
      return;
    }

    const ws = new HyperliquidWS();
    wsRef.current = ws;

    const removeHandler = ws.onMessage((data) => {
      const msg = data as Record<string, unknown>;
      if (msg.channel === 'webData2' && msg.data) {
        const d = msg.data as Record<string, unknown>;
        const mids = useStore.getState().allMids;

        if (d.clearinghouseState) {
          const state = d.clearinghouseState as {
            marginSummary: {
              accountValue: string;
              totalMarginUsed: string;
              totalRawUsd: string;
            };
            assetPositions: Array<{
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
            }>;
          };

          const accountValue = parseFloat(state.marginSummary.accountValue);
          const totalMarginUsed = parseFloat(state.marginSummary.totalMarginUsed);

          let totalUnrealizedPnl = 0;
          for (const ap of state.assetPositions) {
            totalUnrealizedPnl += parseFloat(ap.position.unrealizedPnl);
          }

          setAccountSummary({
            totalValue: accountValue,
            unrealizedPnl: totalUnrealizedPnl,
            realizedPnl: 0, // not available from WS
            usedMargin: totalMarginUsed,
            availableMargin: accountValue - totalMarginUsed,
            marginUsagePercent:
              accountValue > 0 ? (totalMarginUsed / accountValue) * 100 : 0,
          });

          setPositions(parsePositions(state.assetPositions, mids));
        }

        if (d.openOrders) {
          setOrders(
            parseOrders(
              d.openOrders as Array<{
                coin: string;
                side: 'A' | 'B';
                limitPx: string;
                sz: string;
                timestamp: number;
                orderType: string;
              }>,
            ),
          );
        }
      }

      if (msg.channel === 'allMids' && msg.data) {
        const midsData = msg.data as { mids: Record<string, string> };
        setAllMids(midsData.mids);
      }

      if (msg.channel === 'l2Book' && msg.data) {
        const bookData = msg.data as {
          levels: [
            Array<{ px: string; sz: string; n: number }>,
            Array<{ px: string; sz: string; n: number }>,
          ];
        };
        const { bids, asks } = parseL2Book(bookData.levels);
        const bestBid = bids[0]?.price ?? 0;
        const bestAsk = asks[0]?.price ?? 0;
        const spread = bestAsk - bestBid;
        const mid = (bestAsk + bestBid) / 2;
        setOrderbook({
          bids,
          asks,
          spread,
          spreadPercent: mid > 0 ? (spread / mid) * 100 : 0,
        });
      }

      if (msg.channel === 'candle' && msg.data) {
        const candleRaw = msg.data as {
          t: number;
          o: string;
          h: string;
          l: string;
          c: string;
          v: string;
          s: string;
          i: string;
        };
        const candle = parseCandle(candleRaw);
        const current = useStore.getState().candles;
        // Update last candle if same timestamp, otherwise append
        if (current.length > 0 && current[current.length - 1].timestamp === candle.timestamp) {
          setCandles([...current.slice(0, -1), candle]);
        } else {
          setCandles([...current, candle]);
        }
      }

      if (msg.channel === 'activeAssetCtx' && msg.data) {
        const d = msg.data as { ctx: { dayNtlVlm: string; funding: string; openInterest: string; oraclePx: string; prevDayPx: string; markPx: string } };
        const ctx = d.ctx;
        setActiveAssetCtx({
          dayNtlVlm: parseFloat(ctx.dayNtlVlm),
          funding: parseFloat(ctx.funding),
          openInterest: parseFloat(ctx.openInterest),
          oraclePx: parseFloat(ctx.oraclePx),
          prevDayPx: parseFloat(ctx.prevDayPx),
          markPx: parseFloat(ctx.markPx),
        });
      }
    });

    ws.connect();
    ws.subscribe('webData2', { user: walletAddress });
    ws.subscribe('allMids', {});

    return () => {
      removeHandler();
      ws.disconnect();
      wsRef.current = null;
    };
  }, [walletAddress, setPositions, setOrders, setAllMids, setOrderbook, setCandles, setAccountSummary, setActiveAssetCtx]);

  // Subscribe to coin-specific channels when selectedCoin changes
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || !selectedCoin) return;

    ws.subscribe('l2Book', { coin: selectedCoin });
    ws.subscribe('candle', { coin: selectedCoin, interval: '1h' });
    ws.subscribe('activeAssetCtx', { coin: selectedCoin });

    return () => {
      ws.unsubscribe('l2Book', { coin: selectedCoin });
      ws.unsubscribe('candle', { coin: selectedCoin, interval: '1h' });
      ws.unsubscribe('activeAssetCtx', { coin: selectedCoin });
    };
  }, [selectedCoin]);
}
