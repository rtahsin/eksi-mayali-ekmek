import { describe, expect, it } from "vitest";
import { ledgerLine, mapLedger, parseLedgerItems, parseLegacyItems, type LedgerRow } from "./ledger";

const row = (over: Partial<LedgerRow>): LedgerRow => ({
  id: "t1",
  account_id: "cari_1",
  type: "satis",
  amount: 100,
  delta: 100,
  description: null,
  payment_method: null,
  date: "2026-10-04",
  created_at: "2026-10-04T08:00:00Z",
  slip_number: "FİŞ-2610-001",
  order_id: null,
  balance_after: 100,
  items: null,
  reverses_id: null,
  ...over,
});

describe("cari defter eşleme", () => {
  it("eski açıklamadan kalemleri çıkarır", () => {
    expect(parseLegacyItems("[FİŞ-2609-482] 10x Köy Ekmeği (110₺), 5x Siyez (95,5₺) | Not: kapıya")).toEqual([
      { name: "Köy Ekmeği", quantity: 10, unitPrice: 110 },
      { name: "Siyez", quantity: 5, unitPrice: 95.5 },
    ]);
    expect(parseLegacyItems("Açılış bakiyesi")).toEqual([]);
  });

  it("iptal edilen harekete storno kaydını bağlar, tutarı delta'dan alır", () => {
    const txs = mapLedger([
      row({ id: "a" }),
      row({ id: "b", type: "storno", delta: -100, amount: 100, reverses_id: "a", balance_after: 0 }),
      row({ id: "c", type: "tahsilat", delta: "-40", amount: "40", payment_method: "nakit", balance_after: -40 }),
    ]);
    expect(txs[0].reversedById).toBe("b");
    expect(txs[1].reversesId).toBe("a");
    expect(txs[2]).toMatchObject({ type: "tahsilat", delta: -40, amount: 40, balanceAfter: -40 });
  });

  it("jsonb kalemleri tercih eder", () => {
    const [tx] = mapLedger([row({ items: [{ name: "Baget", quantity: 2, unitPrice: 30 }], description: "Not" })]);
    expect(tx.items).toEqual([{ name: "Baget", quantity: 2, unitPrice: 30 }]);
    expect(tx.description).toBe("Not");
  });

  it("sıcak satış ve B2B esnek teslimat iade kalemlerini (productName, unit, lineTotal, isReturn) korur", () => {
    const parsed = parseLedgerItems([
      {
        productId: "p-1",
        name: "Taş Fırın Köy Ekmeği",
        productName: "Taş Fırın Köy Ekmeği",
        quantity: 12,
        unitPrice: 85,
        lineTotal: 1020,
        unit: "800 g",
        isReturn: false,
      },
      {
        productName: "Bayat / Fire İade - Köy Ekmeği",
        quantity: -2,
        unit_price: 85,
        lineTotal: -170,
        unit: "adet",
        isReturn: true,
      },
      {
        name: "Geçersiz lineTotal korumasız geçmez",
        quantity: 1,
        unitPrice: 50,
        lineTotal: "NaN",
        isReturn: "evet",
      },
    ]);

    expect(parsed).toEqual([
      {
        productId: "p-1",
        name: "Taş Fırın Köy Ekmeği",
        productName: "Taş Fırın Köy Ekmeği",
        quantity: 12,
        unitPrice: 85,
        lineTotal: 1020,
        unit: "800 g",
        isReturn: false,
      },
      {
        name: "Bayat / Fire İade - Köy Ekmeği",
        productName: "Bayat / Fire İade - Köy Ekmeği",
        quantity: -2,
        unitPrice: 85,
        lineTotal: -170,
        unit: "adet",
        isReturn: true,
      },
      {
        name: "Geçersiz lineTotal korumasız geçmez",
        quantity: 1,
        unitPrice: 50,
      },
    ]);
  });

  it("mapLedger sıcak satış iade bayrağını korur", () => {
    const [tx] = mapLedger([
      row({
        items: [
          { productName: "Siyez", quantity: 5, unitPrice: 120, lineTotal: 600, unit: "700 g", isReturn: false },
          { productName: "Siyez (İade)", quantity: -1, unitPrice: 120, lineTotal: -120, unit: "700 g", isReturn: true },
        ],
      }),
    ]);

    expect(tx.items).toHaveLength(2);
    expect(tx.items?.[1]).toMatchObject({
      name: "Siyez (İade)",
      productName: "Siyez (İade)",
      quantity: -1,
      unitPrice: 120,
      lineTotal: -120,
      unit: "700 g",
      isReturn: true,
    });
  });
});

describe("ledgerLine", () => {
  const items = [
    { name: "Taş Fırın Ekşi Mayalı Köy Ekmeği", quantity: 10, unitPrice: 110 },
    { name: "%100 Taş Değirmen Siyez Ekmeği", quantity: 2, unitPrice: 150 },
  ];

  it("kalemleri adet ve adla yazar", () => {
    expect(ledgerLine({ description: "", items })).toBe("10× Taş Fırın Ekşi Mayalı Köy Ekmeği, 2× %100 Taş Değirmen Siyez Ekmeği");
  });

  it("notu kalemlerin arkasına ekler", () => {
    expect(ledgerLine({ description: "kapıya bırakıldı", items: items.slice(0, 1) })).toBe(
      "10× Taş Fırın Ekşi Mayalı Köy Ekmeği · kapıya bırakıldı",
    );
  });

  it("eski kayıtta açıklamayı olduğu gibi bırakır", () => {
    const legacy = "20x Taş Fırın Ekşi Mayalı Köy Ekmeği (110₺)";
    expect(ledgerLine({ description: legacy, items: parseLegacyItems(legacy) })).toBe(legacy);
  });

  it("kalemsiz harekette açıklamayı gösterir", () => {
    expect(ledgerLine({ description: "Nakit", items: [] })).toBe("Nakit");
  });
});
