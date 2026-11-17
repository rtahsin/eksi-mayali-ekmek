/**
 * Kurye günlük kasa mutabakatı saf domain motoru.
 * Tek gerçek kaynak: settle, team, dispatch API rotaları ve admin Z-özeti bu motoru kullanır.
 */

const NON_COURIER_COLLECTORS = new Set(["admin", "staff", "store", "system"]);

export interface CourierSettlementOrderInput {
  id: string;
  status: string;
  delivery_method?: string | null;
  total_amount: number | string | null;
  payment_method: string | null;
  payment_status: string | null;
  cari_id: string | null;
  courier_id: string | null;
}

export interface CourierSettlementPaymentInput {
  order_id?: string;
  amount: number | string | null;
  method: string;
  collected_by: string | null;
  courier_id: string | null;
}

export interface CourierOrderCashBreakdown {
  isCariOrder: boolean;
  orderTotal: number;
  doorCash: number;
  retailCash: number;
  b2bCash: number;
  doorCard: number;
  doorTransfer: number;
  cariRemainder: number;
}

export interface CourierDayCashSummary {
  activeStopCount: number;
  deliveredCount: number;
  cashExpected: number;
  retailCashExpected: number;
  b2bCashExpected: number;
  cardExpected: number;
  transferCollected: number;
  cariDeliveredTotal: number;
}

export interface CourierCashVarianceInput {
  cashExpected: number;
  cardExpected: number;
  cashHandedOver: number;
  cardSlipTotal: number;
}

export interface CourierCashVariance {
  cashDiff: number;
  cardDiff: number;
  cashShortfall: number;
  cashOver: number;
  cardShortfall: number;
  cardOver: number;
}

export function cents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isCourierDeliverableOrder(
  order: Pick<CourierSettlementOrderInput, "status" | "delivery_method">
): boolean {
  return order.status !== "iptal" && order.delivery_method !== "pickup";
}

function isCollectedAtDoorByCourier(
  payment: CourierSettlementPaymentInput,
  order: Pick<CourierSettlementOrderInput, "payment_method" | "courier_id">,
  courierId?: string | null
): boolean {
  if (payment.collected_by && NON_COURIER_COLLECTORS.has(payment.collected_by)) {
    return false;
  }

  const effectiveCourierId = courierId ?? order.courier_id;
  const isCourierMatch = Boolean(effectiveCourierId && payment.courier_id === effectiveCourierId);

  return (
    payment.collected_by === "courier" ||
    isCourierMatch ||
    (payment.courier_id === null &&
      (order.payment_method === "cash_on_delivery" || order.payment_method === "pos_at_door"))
  );
}

export function computeCourierOrderCashBreakdown(
  order: CourierSettlementOrderInput,
  payments: readonly CourierSettlementPaymentInput[],
  courierId?: string | null
): CourierOrderCashBreakdown {
  const orderTotal = cents(Number(order.total_amount) || 0);
  const isCariOrder = Boolean(order.cari_id || order.payment_method === "cari");

  let doorCash = 0;
  let doorCard = 0;
  let doorTransfer = 0;

  for (const payment of payments) {
    const amount = cents(Number(payment.amount) || 0);
    if (amount <= 0) continue;
    if (!isCollectedAtDoorByCourier(payment, order, courierId)) continue;

    if (payment.method === "cash") {
      doorCash = cents(doorCash + amount);
    } else if (payment.method === "pos" || payment.method === "pos_at_door") {
      doorCard = cents(doorCard + amount);
    } else if (payment.method === "transfer") {
      doorTransfer = cents(doorTransfer + amount);
    }
  }

  if (payments.length === 0 && order.payment_status === "paid" && !isCariOrder) {
    if (order.payment_method === "cash_on_delivery") {
      doorCash = orderTotal;
    } else if (order.payment_method === "pos_at_door") {
      doorCard = orderTotal;
    }
  }

  const retailCash = isCariOrder ? 0 : doorCash;
  const b2bCash = isCariOrder ? doorCash : 0;
  const cariRemainder = isCariOrder
    ? Math.max(cents(orderTotal - doorCash - doorCard - doorTransfer), 0)
    : 0;

  return {
    isCariOrder,
    orderTotal,
    doorCash,
    retailCash,
    b2bCash,
    doorCard,
    doorTransfer,
    cariRemainder,
  };
}

export function summarizeCourierOrders(
  orders: readonly CourierSettlementOrderInput[],
  paymentsByOrder: ReadonlyMap<string, readonly CourierSettlementPaymentInput[]>,
  courierId?: string | null
): CourierDayCashSummary {
  let activeStopCount = 0;
  let deliveredCount = 0;
  let cashExpected = 0;
  let retailCashExpected = 0;
  let b2bCashExpected = 0;
  let cardExpected = 0;
  let transferCollected = 0;
  let cariDeliveredTotal = 0;

  for (const order of orders) {
    if (!isCourierDeliverableOrder(order)) continue;

    if (order.status !== "teslim_edildi") {
      activeStopCount += 1;
      continue;
    }

    deliveredCount += 1;
    const breakdown = computeCourierOrderCashBreakdown(
      order,
      paymentsByOrder.get(order.id) ?? [],
      courierId ?? order.courier_id
    );

    cashExpected = cents(cashExpected + breakdown.doorCash);
    retailCashExpected = cents(retailCashExpected + breakdown.retailCash);
    b2bCashExpected = cents(b2bCashExpected + breakdown.b2bCash);
    cardExpected = cents(cardExpected + breakdown.doorCard);
    transferCollected = cents(transferCollected + breakdown.doorTransfer);
    cariDeliveredTotal = cents(cariDeliveredTotal + breakdown.cariRemainder);
  }

  return {
    activeStopCount,
    deliveredCount,
    cashExpected,
    retailCashExpected,
    b2bCashExpected,
    cardExpected,
    transferCollected,
    cariDeliveredTotal,
  };
}

export function computeCourierCashVariance(
  input: CourierCashVarianceInput
): CourierCashVariance {
  const cashExpected = cents(Number(input.cashExpected) || 0);
  const cardExpected = cents(Number(input.cardExpected) || 0);
  const cashHandedOver = cents(Number(input.cashHandedOver) || 0);
  const cardSlipTotal = cents(Number(input.cardSlipTotal) || 0);

  const cashDiff = cents(cashHandedOver - cashExpected);
  const cardDiff = cents(cardSlipTotal - cardExpected);

  return {
    cashDiff,
    cardDiff,
    cashShortfall: Math.max(0, cents(cashExpected - cashHandedOver)),
    cashOver: Math.max(0, cents(cashHandedOver - cashExpected)),
    cardShortfall: Math.max(0, cents(cardExpected - cardSlipTotal)),
    cardOver: Math.max(0, cents(cardSlipTotal - cardExpected)),
  };
}
