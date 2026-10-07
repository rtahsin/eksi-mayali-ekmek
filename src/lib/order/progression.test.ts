import { describe, it, expect } from "vitest";
import {
  getOrderProgress,
  buildReorderItems,
  extractPostponedNotice,
} from "./progression";
import type { OrderItem, ExtendedProduct } from "@/types";

describe("getOrderProgress pure function (I-03)", () => {
  it("maps 'bekliyor' to step 0", () => {
    const res = getOrderProgress("bekliyor");
    expect(res.currentStepIndex).toBe(0);
    expect(res.steps[0].isCurrent).toBe(true);
    expect(res.steps[0].label).toBe("Bekliyor");
    expect(res.isCancelled).toBe(false);
    expect(res.isDelivered).toBe(false);
  });

  it("maps 'hazirlaniyor' to step 1", () => {
    const res = getOrderProgress("hazirlaniyor");
    expect(res.currentStepIndex).toBe(1);
    expect(res.steps[0].isCompleted).toBe(true);
    expect(res.steps[1].isCurrent).toBe(true);
  });

  it("maps 'firinda' to step 2", () => {
    const res = getOrderProgress("firinda");
    expect(res.currentStepIndex).toBe(2);
    expect(res.steps[1].isCompleted).toBe(true);
    expect(res.steps[2].isCurrent).toBe(true);
  });

  it("maps 'kuryede' / 'yolda' to step 3", () => {
    const res = getOrderProgress("kuryede");
    expect(res.currentStepIndex).toBe(3);
    expect(res.steps[2].isCompleted).toBe(true);
    expect(res.steps[3].isCurrent).toBe(true);

    const resYolda = getOrderProgress("yolda");
    expect(resYolda.currentStepIndex).toBe(3);
  });

  it("maps 'teslim_edildi' to step 4 and marks delivered", () => {
    const res = getOrderProgress("teslim_edildi");
    expect(res.currentStepIndex).toBe(4);
    expect(res.steps[4].isCompleted).toBe(true);
    expect(res.steps[4].isCurrent).toBe(true);
    expect(res.isDelivered).toBe(true);
  });

  it("handles 'iptal' gracefully", () => {
    const res = getOrderProgress("iptal");
    expect(res.currentStepIndex).toBe(-1);
    expect(res.isCancelled).toBe(true);
    expect(res.isDelivered).toBe(false);
    expect(res.statusLabel).toBe("İptal Edildi");
  });
});

describe("buildReorderItems pure function (I-03)", () => {
  const catalog: ExtendedProduct[] = [
    {
      id: "prod-1",
      name: "Köy Ekmeği",
      description: "Klasik",
      price: 150, // Updated price
      imageUrl: "/images/bread.jpg",
      category: "bread",
      stock: 10,
      weight: 800,
      isActive: true,
      isAvailable: true,
    },
    {
      id: "prod-2",
      name: "Tulum Peyniri",
      description: "Gurme",
      price: 220,
      imageUrl: "/images/cheese.jpg",
      category: "pantry",
      stock: 5,
      weight: 350,
      isActive: true,
      isAvailable: false, // Currently sold out
    },
  ];

  it("uses server catalog price and filters available products", () => {
    const orderItems: OrderItem[] = [
      {
        productId: "prod-1",
        productName: "Köy Ekmeği (Eski)",
        quantity: 2,
        unitPrice: 120, // Old price
        totalPrice: 240,
      },
      {
        productId: "prod-2",
        productName: "Tulum Peyniri",
        quantity: 1,
        unitPrice: 200,
        totalPrice: 200,
      },
      {
        productId: "prod-deleted",
        productName: "Eski Ürün",
        quantity: 1,
        unitPrice: 50,
        totalPrice: 50,
      },
    ];

    const plan = buildReorderItems(orderItems, catalog);

    expect(plan.availableItems).toHaveLength(1);
    expect(plan.availableItems[0].product.id).toBe("prod-1");
    expect(plan.availableItems[0].product.price).toBe(150); // Server price!
    expect(plan.availableItems[0].quantity).toBe(2);

    expect(plan.unavailableItems).toHaveLength(2);
    expect(plan.unavailableItems.map((u) => u.productId)).toEqual(["prod-2", "prod-deleted"]);
  });
});

describe("extractPostponedNotice pure function (I-03 / I-05)", () => {
  it("extracts postponed note from status history", () => {
    const history = [
      { note: "Sipariş oluşturuldu", changedByRole: "customer" },
      {
        note: "Gece Yarısı eşiğe ulaşmadığı için (7/10) teslimat 17.10.2026 tarihine kaydırıldı",
        changedByRole: "system",
      },
    ];

    const notice = extractPostponedNotice(history);
    expect(notice).toContain("Gece Yarısı eşiğe ulaşmadığı için");
    expect(notice).toContain("17.10.2026");
  });

  it("returns null if no threshold shift note exists", () => {
    const history = [
      { note: "Sipariş oluşturuldu", changedByRole: "customer" },
      { note: "Fırına verildi", changedByRole: "admin" },
    ];

    expect(extractPostponedNotice(history)).toBeNull();
  });
});
