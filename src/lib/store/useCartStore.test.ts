import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtendedProduct } from "@/types";
const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
});
const { useCartStore } = await import("./useCartStore");
afterAll(() => vi.unstubAllGlobals());

const bread: ExtendedProduct = { id: "bread", name: "Köy Ekmeği", description: "", price: 150, imageUrl: "/bread.webp", category: "bread", stock: 0, weight: 800, weightUnit: "g", isAvailable: true };
const milk: ExtendedProduct = { ...bread, id: "milk", name: "Süt", price: 200, weight: 3000, weightUnit: "ml", category: "mandira" };

beforeEach(() => {
  useCartStore.setState({ items: [], isOpen: false, termsAccepted: false, pendingReorder: null, notice: null, noticeSequence: 0 });
});

describe("sepet etkileşimleri", () => {
  it("iki ürün eklendikten sonra sepeti açmak adedi ve tutarı değiştirmez", () => {
    useCartStore.getState().addItem(bread, null, 2);
    expect(useCartStore.getState().isOpen).toBe(false);
    expect(useCartStore.getState().notice?.quantity).toBe(2);
    useCartStore.getState().openCart();
    expect(useCartStore.getState().getItemCount()).toBe(2);
    expect(useCartStore.getState().getSubtotal()).toBe(300);
    expect(useCartStore.getState().notice).toBeNull();
  });

  it("süt birimini yeni eklemede ve tekrar siparişte korur", () => {
    useCartStore.getState().addItem(milk);
    expect(useCartStore.getState().items[0].weightUnit).toBe("ml");
    useCartStore.getState().clearCart();
    useCartStore.getState().applyReorder([milk], [{ productId: "milk", name: "Süt", quantity: 1 }]);
    expect(useCartStore.getState().items[0].weightUnit).toBe("ml");
  });

  it("dolu sepeti tekrar sipariş seçimi yapılmadan değiştirmez; vazgeç eski sepeti korur", () => {
    useCartStore.getState().addItem(milk, null, 2);
    const result = useCartStore.getState().applyReorder([bread], [{ productId: "bread", name: "Ekmek", quantity: 1 }]);
    expect(result.needsConfirmation).toBe(true);
    expect(useCartStore.getState().items.map((i) => i.productId)).toEqual(["milk"]);
    useCartStore.getState().cancelReorder();
    expect(useCartStore.getState().pendingReorder).toBeNull();
    expect(useCartStore.getState().getSubtotal()).toBe(400);
  });

  it("ekle seçimi mevcut ürünleri korur ve aynı ürünün adetlerini birleştirir", () => {
    useCartStore.getState().addItem(bread, null, 2);
    useCartStore.getState().addItem(milk);
    useCartStore.getState().applyReorder([bread], [{ productId: "bread", name: "Ekmek", quantity: 3 }]);
    useCartStore.getState().confirmReorder("append");
    expect(useCartStore.getState().items.find((i) => i.productId === "bread")?.quantity).toBe(5);
    expect(useCartStore.getState().items.find((i) => i.productId === "milk")?.quantity).toBe(1);
    expect(useCartStore.getState().pendingReorder).toBeNull();
  });

  it("değiştir yalnız açık seçimden sonra eski ürünleri kaldırır ve sözleşme onayını sıfırlar", () => {
    useCartStore.getState().addItem(milk);
    useCartStore.getState().setTermsAccepted(true);
    useCartStore.getState().applyReorder([bread], [{ productId: "bread", name: "Ekmek", quantity: 2 }]);
    useCartStore.getState().confirmReorder("replace");
    expect(useCartStore.getState().items.map((i) => i.productId)).toEqual(["bread"]);
    expect(useCartStore.getState().getItemCount()).toBe(2);
    expect(useCartStore.getState().termsAccepted).toBe(false);
  });

  it("satıştan kaldırılmış geçmiş ürünler için mevcut sepeti silmez", () => {
    useCartStore.getState().addItem(milk);
    const result = useCartStore.getState().applyReorder([{ ...bread, isAvailable: false }], [{ productId: "bread", name: "Eski ekmek", quantity: 2 }]);
    expect(result.addedCount).toBe(0);
    expect(result.unavailableNames).toEqual(["Eski ekmek"]);
    expect(useCartStore.getState().items[0].productId).toBe("milk");
    expect(useCartStore.getState().pendingReorder).toBeNull();
  });

  it("geçersiz miktar ve tükenmiş ürün sepete eklenmez", () => {
    for (const quantity of [0, -1, 0.5, NaN, Infinity]) expect(useCartStore.getState().addItem(bread, null, quantity)).toBe(false);
    expect(useCartStore.getState().addItem({ ...bread, isAvailable: false })).toBe(false);
    expect(useCartStore.getState().items).toEqual([]);
  });
});
