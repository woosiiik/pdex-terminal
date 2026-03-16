import type { OpenOrder, StrategyDetectionResult, StrategyType, OrderMarketContext } from "../types/index.js";

export function detectStrategy(
  orders: OpenOrder[],
  currentPrice: number,
  marketCtx?: OrderMarketContext,
): StrategyDetectionResult {
  if (orders.length === 0) {
    return {
      detectedStrategy: "unknown",
      confidence: "low",
      description: "주문이 없습니다",
      orderCount: 0,
      priceRange: { min: 0, max: 0 },
      buyCount: 0,
      sellCount: 0,
    };
  }

  const prices = orders.map((o) => o.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const buyOrders = orders.filter((o) => o.side === "buy");
  const sellOrders = orders.filter((o) => o.side === "sell");

  let strategy: StrategyType = "unknown";
  let confidence: "high" | "medium" | "low" = "low";
  let description = "";

  // Grid Trading: both buy and sell orders with roughly equal spacing
  if (buyOrders.length >= 2 && sellOrders.length >= 2) {
    const isGrid = checkGridPattern(orders);
    if (isGrid) {
      strategy = "grid";
      confidence = buyOrders.length + sellOrders.length >= 6 ? "high" : "medium";
      description = `$${min.toLocaleString()} ~ $${max.toLocaleString()} 구간에서 그리드 트레이딩 전략`;
    }
  }

  // Range Trading: buy near low, sell near high
  if (strategy === "unknown" && buyOrders.length > 0 && sellOrders.length > 0) {
    const avgBuy = avg(buyOrders.map((o) => o.price));
    const avgSell = avg(sellOrders.map((o) => o.price));
    if (avgBuy < currentPrice && avgSell > currentPrice) {
      strategy = "range";
      confidence = "medium";
      description = `$${min.toLocaleString()} ~ $${max.toLocaleString()} 범위 내 레인지 트레이딩`;
    }
  }

  // Accumulation: mostly buy orders below current price
  if (strategy === "unknown" && buyOrders.length > 0 && sellOrders.length === 0) {
    const allBelow = buyOrders.every((o) => o.price < currentPrice);
    if (allBelow) {
      strategy = "accumulation";
      confidence = buyOrders.length >= 3 ? "high" : "medium";
      description = `현재가 하방에 ${buyOrders.length}개 매수 주문 — 점진적 매집 전략`;
    }
  }

  // Breakout: orders clustered near S/R levels (single direction)
  if (strategy === "unknown") {
    const allAbove = orders.every((o) => o.price > currentPrice);
    const allBelow = orders.every((o) => o.price < currentPrice);
    if (allAbove || allBelow) {
      strategy = "breakout";
      confidence = "medium";
      const dir = allAbove ? "상방" : "하방";
      description = `${dir} 돌파 진입 전략 — ${orders.length}개 주문이 현재가 ${dir}에 배치`;
    }
  }

  if (strategy === "unknown") {
    description = `${orders.length}개 주문 분석 — 명확한 전략 패턴 미탐지`;
  }

  // Append funding context if available
  if (marketCtx && strategy !== "unknown") {
    const fr = marketCtx.fundingRate;
    if (Math.abs(fr) >= 0.01) {
      const frDir = fr > 0 ? "롱 과열" : "숏 과열";
      description += ` | 펀딩 ${frDir} (${fr >= 0 ? "+" : ""}${(fr * 100).toFixed(4)}%)`;
    }
    if (marketCtx.volatility24h > 0.03) {
      description += ` | 고변동성 (${(marketCtx.volatility24h * 100).toFixed(1)}%)`;
    }
  }

  return {
    detectedStrategy: strategy,
    confidence,
    description,
    orderCount: orders.length,
    priceRange: { min, max },
    buyCount: buyOrders.length,
    sellCount: sellOrders.length,
  };
}

function checkGridPattern(orders: OpenOrder[]): boolean {
  const sorted = [...orders].sort((a, b) => a.price - b.price);
  if (sorted.length < 4) return false;
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i].price - sorted[i - 1].price);
  }
  const avgGap = avg(gaps);
  if (avgGap === 0) return false;
  // Check if gaps are roughly equal (within 50% of average)
  return gaps.every((g) => Math.abs(g - avgGap) / avgGap < 0.5);
}

function avg(nums: number[]): number {
  return nums.length === 0 ? 0 : nums.reduce((s, n) => s + n, 0) / nums.length;
}
