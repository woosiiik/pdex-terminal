import type { LiquidationClusterResult, PriceCluster } from "../types/index.js";

interface LiquidationDataPoint {
  priceLevel: number;
  estimatedVolume: number;
  side: "long" | "short";
}

export function analyzeLiquidationClusters(
  currentPrice: number,
  liquidationData: LiquidationDataPoint[],
  warningThreshold: number = 0.02,
): LiquidationClusterResult {
  const longClusters: PriceCluster[] = [];
  const shortClusters: PriceCluster[] = [];

  for (const dp of liquidationData) {
    const distancePercent = ((dp.priceLevel - currentPrice) / currentPrice) * 100;
    const cluster: PriceCluster = {
      priceLevel: dp.priceLevel,
      estimatedVolume: dp.estimatedVolume,
      distancePercent,
    };
    if (dp.side === "long") {
      longClusters.push(cluster);
    } else {
      shortClusters.push(cluster);
    }
  }

  // Sort by distance from current price
  longClusters.sort((a, b) => Math.abs(a.distancePercent) - Math.abs(b.distancePercent));
  shortClusters.sort((a, b) => Math.abs(a.distancePercent) - Math.abs(b.distancePercent));

  const thresholdPct = warningThreshold * 100;
  const longNearby = longClusters.some((c) => Math.abs(c.distancePercent) <= thresholdPct);
  const shortNearby = shortClusters.some((c) => Math.abs(c.distancePercent) <= thresholdPct);

  let nearbyWarning = false;
  let nearbyClusterSide: LiquidationClusterResult["nearbyClusterSide"] = null;

  if (longNearby && shortNearby) {
    nearbyWarning = true;
    nearbyClusterSide = "both";
  } else if (longNearby) {
    nearbyWarning = true;
    nearbyClusterSide = "long";
  } else if (shortNearby) {
    nearbyWarning = true;
    nearbyClusterSide = "short";
  }

  return {
    longClusters,
    shortClusters,
    nearbyWarning,
    nearbyClusterSide,
  };
}
