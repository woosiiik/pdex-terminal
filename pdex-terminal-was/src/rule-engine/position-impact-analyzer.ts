import type { OpenOrder, OpenPosition, PositionImpactResult, PositionImpactItem, OrderPurpose } from "../types/index.js";

export function analyzePositionImpact(
  orders: OpenOrder[],
  positions: OpenPosition[],
  currentPrice: number,
): PositionImpactResult {
  const items: PositionImpactItem[] = [];
  let hasRiskReduction = false;
  let hasRiskIncrease = false;

  for (const order of orders) {
    const matchedPos = positions.find((p) => p.coin === order.coin);
    let purpose: OrderPurpose;
    let description: string;

    if (!matchedPos) {
      purpose = "new_entry";
      description = `${order.coin} 신규 ${order.side === "buy" ? "롱" : "숏"} 진입 주문`;
    } else {
      const result = classifyOrderPurpose(order, matchedPos, currentPrice);
      purpose = result.purpose;
      description = result.description;
    }

    if (purpose === "take_profit" || purpose === "stop_loss" || purpose === "hedging") {
      hasRiskReduction = true;
    }
    if (purpose === "position_expansion") {
      hasRiskIncrease = true;
    }

    items.push({
      coin: order.coin,
      orderSide: order.side,
      orderPrice: order.price,
      orderSize: order.size,
      purpose,
      description,
    });
  }

  return { items, hasRiskReduction, hasRiskIncrease };
}

function classifyOrderPurpose(
  order: OpenOrder,
  position: OpenPosition,
  currentPrice: number,
): { purpose: OrderPurpose; description: string } {
  const isLong = position.side === "long";
  const isClosingDirection =
    (isLong && order.side === "sell") || (!isLong && order.side === "buy");

  if (isClosingDirection) {
    // Closing direction — take profit or stop loss?
    if (isLong) {
      if (order.price > position.entryPrice) {
        return { purpose: "take_profit", description: `롱 포지션 익절 주문 ($${order.price.toLocaleString()})` };
      } else {
        return { purpose: "stop_loss", description: `롱 포지션 손절 주문 ($${order.price.toLocaleString()})` };
      }
    } else {
      if (order.price < position.entryPrice) {
        return { purpose: "take_profit", description: `숏 포지션 익절 주문 ($${order.price.toLocaleString()})` };
      } else {
        return { purpose: "stop_loss", description: `숏 포지션 손절 주문 ($${order.price.toLocaleString()})` };
      }
    }
  }

  // Same direction as position — expansion or hedging?
  const isSameDirection =
    (isLong && order.side === "buy") || (!isLong && order.side === "sell");

  if (isSameDirection) {
    return { purpose: "position_expansion", description: `${isLong ? "롱" : "숏"} 포지션 추가 진입 주문` };
  }

  // Opposite direction new entry — hedging
  return { purpose: "hedging", description: `${isLong ? "숏" : "롱"} 헤지 주문` };
}
