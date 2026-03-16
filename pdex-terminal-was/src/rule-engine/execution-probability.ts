import type { OpenOrder, ExecutionProbabilityResult, ExecutionProbabilityItem, ExecutionProbability, OrderMarketContext, L2Book } from "../types/index.js";

export function analyzeExecutionProbability(
  orders: OpenOrder[],
  currentPrice: number,
  marketCtx?: OrderMarketContext,
): ExecutionProbabilityResult {
  // Volatility-adjusted thresholds: higher volatility = wider "high" probability zone
  const vol = marketCtx?.volatility24h ?? 0;
  const highThreshold = Math.max(2, vol * 100 * 1.5);   // default 2%, scales with volatility
  const mediumThreshold = Math.max(10, vol * 100 * 5);   // default 10%

  const items: ExecutionProbabilityItem[] = orders.map((o) => {
    const distancePercent = ((o.price - currentPrice) / currentPrice) * 100;
    const absDist = Math.abs(distancePercent);

    let probability: ExecutionProbability;
    if (absDist <= highThreshold) {
      probability = "high";
    } else if (absDist <= mediumThreshold) {
      probability = "medium";
    } else {
      probability = "low";
    }

    // Boost probability if L2 book shows thin liquidity at that level
    if (marketCtx?.l2Book && probability === "medium") {
      const boosted = checkL2Liquidity(o, marketCtx.l2Book, currentPrice);
      if (boosted) probability = "high";
    }

    return {
      coin: o.coin,
      side: o.side,
      price: o.price,
      size: o.size,
      distancePercent,
      probability,
    };
  });

  return {
    items,
    highCount: items.filter((i) => i.probability === "high").length,
    mediumCount: items.filter((i) => i.probability === "medium").length,
    lowCount: items.filter((i) => i.probability === "low").length,
  };
}

/**
 * Check if L2 book liquidity is thin between current price and order price.
 * If cumulative size in the path is small, the order is more likely to fill.
 */
function checkL2Liquidity(order: OpenOrder, book: L2Book, currentPrice: number): boolean {
  // For buy orders below current price: check bid side depth
  // For sell orders above current price: check ask side depth
  const levels = order.side === "buy" ? book.bids : book.asks;
  if (levels.length === 0) return false;

  // Sum liquidity between current price and order price
  const lo = Math.min(currentPrice, order.price);
  const hi = Math.max(currentPrice, order.price);
  const inRange = levels.filter((l) => l.price >= lo && l.price <= hi);
  const totalSize = inRange.reduce((s, l) => s + l.size, 0);

  // If total liquidity in the path is less than 2x the order size, it's thin → boost
  return totalSize < order.size * 2;
}
