import type { OpenOrder, OrderClusterResult, OrderCluster, ClusterType } from "../types/index.js";

export function analyzeOrderClusters(
  orders: OpenOrder[],
  currentPrice: number,
  bucketPercent: number = 1,
): OrderClusterResult {
  if (orders.length === 0) {
    return { clusters: [], dominantSide: "balanced" };
  }

  // Group orders into price buckets
  const buckets = new Map<number, { orders: OpenOrder[]; totalSize: number }>();

  for (const o of orders) {
    const bucketKey = Math.round(o.price / (currentPrice * bucketPercent / 100)) * (currentPrice * bucketPercent / 100);
    const existing = buckets.get(bucketKey);
    if (existing) {
      existing.orders.push(o);
      existing.totalSize += o.size;
    } else {
      buckets.set(bucketKey, { orders: [o], totalSize: o.size });
    }
  }

  // Only keep buckets with 2+ orders as clusters
  const clusters: OrderCluster[] = [];
  for (const [priceLevel, bucket] of buckets) {
    if (bucket.orders.length < 2) continue;

    const buyCount = bucket.orders.filter((o) => o.side === "buy").length;
    const sellCount = bucket.orders.filter((o) => o.side === "sell").length;
    const side: "buy" | "sell" = buyCount >= sellCount ? "buy" : "sell";
    const distancePercent = ((priceLevel - currentPrice) / currentPrice) * 100;

    let clusterType: ClusterType;
    if (side === "sell" && priceLevel > currentPrice) {
      clusterType = "distribution_zone";
    } else if (side === "sell" && priceLevel <= currentPrice) {
      clusterType = "sell_wall";
    } else if (side === "buy" && priceLevel < currentPrice) {
      clusterType = "accumulation_zone";
    } else {
      clusterType = "accumulation_zone";
    }

    clusters.push({
      priceLevel,
      totalSize: bucket.totalSize,
      orderCount: bucket.orders.length,
      side,
      clusterType,
      distancePercent,
    });
  }

  clusters.sort((a, b) => Math.abs(a.distancePercent) - Math.abs(b.distancePercent));

  // Determine dominant side
  const totalBuy = orders.filter((o) => o.side === "buy").reduce((s, o) => s + o.size * o.price, 0);
  const totalSell = orders.filter((o) => o.side === "sell").reduce((s, o) => s + o.size * o.price, 0);
  const ratio = totalBuy + totalSell > 0 ? totalBuy / (totalBuy + totalSell) : 0.5;
  const dominantSide = ratio > 0.6 ? "buy" : ratio < 0.4 ? "sell" : "balanced";

  return { clusters, dominantSide };
}
