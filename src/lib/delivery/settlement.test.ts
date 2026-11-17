import { describe, expect, it } from "vitest";
import {
  computeCourierCashVariance,
  computeCourierOrderCashBreakdown,
  isCourierDeliverableOrder,
  summarizeCourierOrders,
  type CourierSettlementOrderInput,
  type CourierSettlementPaymentInput,
} from "./settlement";

const COURIER_ID = "courier-1";

describe("delivery/settlement motoru", () => {
  it("1. delivery_method = pickup siparislerini aktif durak ve mutabakattan haric tutar", () => {
    const pickupActive: CourierSettlementOrderInput = {
      id: "ord-pickup-1",
      status: "kuryede",
      delivery_method: "pickup",
      total_amount: 180,
      payment_method: "cash_on_delivery",
      payment_status: "pending",
      cari_id: null,
      courier_id: COURIER_ID,
    };
    const pickupDelivered: CourierSettlementOrderInput = {
      id: "ord-pickup-2",
      status: "teslim_edildi",
      delivery_method: "pickup",
      total_amount: 250,
      payment_method: "cash_on_delivery",
      payment_status: "paid",
      cari_id: null,
      courier_id: COURIER_ID,
    };

    expect(isCourierDeliverableOrder(pickupActive)).toBe(false);
    expect(isCourierDeliverableOrder(pickupDelivered)).toBe(false);

    const summary = summarizeCourierOrders([pickupActive, pickupDelivered], new Map(), COURIER_ID);
    expect(summary).toEqual({
      activeStopCount: 0,
      deliveredCount: 0,
      cashExpected: 0,
      retailCashExpected: 0,
      b2bCashExpected: 0,
      cardExpected: 0,
      transferCollected: 0,
      cariDeliveredTotal: 0,
    });
  });

  it("2. B2B/cari kapida nakit tahsilati retailCashExpected icine karistirmaz, ayri raporlar", () => {
    const retailOrder: CourierSettlementOrderInput = {
      id: "ord-retail",
      status: "teslim_edildi",
      delivery_method: "courier",
      total_amount: 300,
      payment_method: "cash_on_delivery",
      payment_status: "paid",
      cari_id: null,
      courier_id: COURIER_ID,
    };
    const b2bOrder: CourierSettlementOrderInput = {
      id: "ord-b2b",
      status: "teslim_edildi",
      delivery_method: "courier",
      total_amount: 1000,
      payment_method: "cari",
      payment_status: "partial",
      cari_id: "cari-1",
      courier_id: COURIER_ID,
    };

    const paymentsByOrder = new Map<string, CourierSettlementPaymentInput[]>([
      [
        "ord-retail",
        [{ amount: 300, method: "cash", collected_by: "courier", courier_id: COURIER_ID }],
      ],
      [
        "ord-b2b",
        [{ amount: 400, method: "cash", collected_by: "courier", courier_id: COURIER_ID }],
      ],
    ]);

    const summary = summarizeCourierOrders([retailOrder, b2bOrder], paymentsByOrder, COURIER_ID);
    expect(summary.cashExpected).toBe(700);
    expect(summary.retailCashExpected).toBe(300);
    expect(summary.b2bCashExpected).toBe(400);
    expect(summary.cariDeliveredTotal).toBe(600);
  });

  it("3. B2B havale (transfer) tahsilatini transferCollected sayar ve cariRemainder tutarindan duser", () => {
    const b2bTransferOrder: CourierSettlementOrderInput = {
      id: "ord-b2b-transfer",
      status: "teslim_edildi",
      delivery_method: "courier",
      total_amount: 1200,
      payment_method: "cari",
      payment_status: "partial",
      cari_id: "cari-2",
      courier_id: COURIER_ID,
    };

    const breakdown = computeCourierOrderCashBreakdown(
      b2bTransferOrder,
      [
        { amount: 250, method: "cash", collected_by: "courier", courier_id: COURIER_ID },
        { amount: 450, method: "transfer", collected_by: "courier", courier_id: COURIER_ID },
      ],
      COURIER_ID
    );

    expect(breakdown.doorCash).toBe(250);
    expect(breakdown.doorTransfer).toBe(450);
    expect(breakdown.b2bCash).toBe(250);
    expect(breakdown.retailCash).toBe(0);
    expect(breakdown.cariRemainder).toBe(500);

    const summary = summarizeCourierOrders(
      [b2bTransferOrder],
      new Map([
        [
          b2bTransferOrder.id,
          [
            { amount: 250, method: "cash", collected_by: "courier", courier_id: COURIER_ID },
            { amount: 450, method: "transfer", collected_by: "courier", courier_id: COURIER_ID },
          ],
        ],
      ]),
      COURIER_ID
    );
    expect(summary.transferCollected).toBe(450);
    expect(summary.cariDeliveredTotal).toBe(500);
  });

  it("4. collected_by = admin veya store olan odemeleri kurye kapida tahsilatina yazmaz", () => {
    const order: CourierSettlementOrderInput = {
      id: "ord-admin-paid",
      status: "teslim_edildi",
      delivery_method: "courier",
      total_amount: 500,
      payment_method: "cash_on_delivery",
      payment_status: "paid",
      cari_id: null,
      courier_id: COURIER_ID,
    };

    const breakdown = computeCourierOrderCashBreakdown(
      order,
      [
        { amount: 300, method: "cash", collected_by: "admin", courier_id: null },
        { amount: 200, method: "cash", collected_by: "store", courier_id: COURIER_ID },
      ],
      COURIER_ID
    );

    expect(breakdown.doorCash).toBe(0);
    expect(breakdown.retailCash).toBe(0);
    expect(breakdown.doorCard).toBe(0);
  });

  it("5. Parcali online + kapida nakit odemede sadece kapida alinan kismi kurye zimmetine yazar", () => {
    const order: CourierSettlementOrderInput = {
      id: "ord-partial-online",
      status: "teslim_edildi",
      delivery_method: "courier",
      total_amount: 450,
      payment_method: "cash_on_delivery",
      payment_status: "paid",
      cari_id: null,
      courier_id: COURIER_ID,
    };

    const breakdown = computeCourierOrderCashBreakdown(
      order,
      [
        { amount: 150, method: "online", collected_by: "system", courier_id: null },
        { amount: 300, method: "cash", collected_by: "courier", courier_id: COURIER_ID },
      ],
      COURIER_ID
    );

    expect(breakdown.doorCash).toBe(300);
    expect(breakdown.retailCash).toBe(300);
    expect(breakdown.doorCard).toBe(0);
  });

  it("6. Odeme satiri yoksa eski paid + pos_at_door/cash_on_delivery perakende sipariste fallback uygular", () => {
    const legacyCardOrder: CourierSettlementOrderInput = {
      id: "ord-legacy-pos",
      status: "teslim_edildi",
      delivery_method: null,
      total_amount: "275.5",
      payment_method: "pos_at_door",
      payment_status: "paid",
      cari_id: null,
      courier_id: COURIER_ID,
    };
    const legacyOnlineOrder: CourierSettlementOrderInput = {
      id: "ord-legacy-online",
      status: "teslim_edildi",
      delivery_method: "courier",
      total_amount: 220,
      payment_method: "online",
      payment_status: "paid",
      cari_id: null,
      courier_id: COURIER_ID,
    };

    const summary = summarizeCourierOrders(
      [legacyCardOrder, legacyOnlineOrder],
      new Map(),
      COURIER_ID
    );
    expect(summary.deliveredCount).toBe(2);
    expect(summary.cardExpected).toBe(275.5);
    expect(summary.cashExpected).toBe(0);
  });

  it("7. courier_id null olsa bile legacy cod/pos_at_door odemeyi collected_by bosken kuryeye sayar", () => {
    const order: CourierSettlementOrderInput = {
      id: "ord-null-courier-pay",
      status: "teslim_edildi",
      delivery_method: "courier",
      total_amount: 190,
      payment_method: "pos_at_door",
      payment_status: "paid",
      cari_id: null,
      courier_id: COURIER_ID,
    };

    const breakdown = computeCourierOrderCashBreakdown(
      order,
      [{ amount: 190, method: "pos_at_door", collected_by: null, courier_id: null }],
      COURIER_ID
    );

    expect(breakdown.doorCard).toBe(190);
  });

  it("8. Aktif duraklar, teslim edilenler ve iptaller dogru siniflandirilir", () => {
    const orders: CourierSettlementOrderInput[] = [
      {
        id: "o-active",
        status: "kuryede",
        delivery_method: "courier",
        total_amount: 120,
        payment_method: "cash_on_delivery",
        payment_status: "pending",
        cari_id: null,
        courier_id: COURIER_ID,
      },
      {
        id: "o-cancel",
        status: "iptal",
        delivery_method: "courier",
        total_amount: 150,
        payment_method: "cash_on_delivery",
        payment_status: "pending",
        cari_id: null,
        courier_id: COURIER_ID,
      },
      {
        id: "o-done",
        status: "teslim_edildi",
        delivery_method: "courier",
        total_amount: 210,
        payment_method: "cash_on_delivery",
        payment_status: "paid",
        cari_id: null,
        courier_id: COURIER_ID,
      },
    ];

    const summary = summarizeCourierOrders(orders, new Map(), COURIER_ID);
    expect(summary.activeStopCount).toBe(1);
    expect(summary.deliveredCount).toBe(1);
    expect(summary.cashExpected).toBe(210);
  });

  it("9. computeCourierCashVariance teslim edilen nakit/POS acigini ve fazlasini kurus hassasiyetinde hesaplar", () => {
    const short = computeCourierCashVariance({
      cashExpected: 1000.5,
      cardExpected: 450,
      cashHandedOver: 850.25,
      cardSlipTotal: 450,
    });
    expect(short).toEqual({
      cashDiff: -150.25,
      cardDiff: 0,
      cashShortfall: 150.25,
      cashOver: 0,
      cardShortfall: 0,
      cardOver: 0,
    });

    const over = computeCourierCashVariance({
      cashExpected: 500,
      cardExpected: 300,
      cashHandedOver: 520,
      cardSlipTotal: 280,
    });
    expect(over).toEqual({
      cashDiff: 20,
      cardDiff: -20,
      cashShortfall: 0,
      cashOver: 20,
      cardShortfall: 20,
      cardOver: 0,
    });
  });
});
