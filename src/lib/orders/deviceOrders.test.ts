import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isDeviceOrder,
  readDeviceOrders,
  rememberDeviceOrder,
  updateDeviceOrderItems,
  forgetDeviceOrders,
  type DeviceOrder,
} from "./deviceOrders";
import type { ExtendedProduct } from "@/types";

const STORAGE_KEY = "ekmeklab_device_orders_v1";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key) ?? null : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe("deviceOrders (M-03C)", () => {
  let memoryStorage: Storage;

  beforeEach(() => {
    memoryStorage = createMemoryStorage();
    vi.stubGlobal("window", { localStorage: memoryStorage });
    vi.stubGlobal("localStorage", memoryStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("SSR ortamında (window tanımsızken) sessizce boş dizi döner ve hata fırlatmaz", () => {
    vi.unstubAllGlobals();
    expect(readDeviceOrders()).toEqual([]);
    expect(() =>
      rememberDeviceOrder({
        id: "ord-1",
        orderNumber: "SIP-2611-001",
        token: "tok-1",
        deliveryDate: "2026-11-15",
        totalAmount: 300,
        createdAt: "2026-11-13T18:00:00Z",
      })
    ).not.toThrow();
    expect(() =>
      updateDeviceOrderItems("ord-1", [{ productId: "p-1", name: "Karakılçık Ekmeği", quantity: 2 }])
    ).not.toThrow();
  });

  it("eski items alanı içermeyen kayıtları geçerli sayar, bozuk kayıtları filtreler", () => {
    const raw = [
      {
        id: "legacy-1",
        orderNumber: "SIP-2610-099",
        token: "tok-legacy",
        deliveryDate: "2026-10-20",
        totalAmount: 240,
        createdAt: "2026-10-19T12:00:00Z",
      },
      {
        id: "bad-items",
        orderNumber: "SIP-2610-100",
        token: "tok-bad",
        deliveryDate: "2026-10-21",
        totalAmount: 180,
        createdAt: "2026-10-20T12:00:00Z",
        items: [{ productId: 123, name: "Bozuk", quantity: "iki" }],
      },
      {
        id: "valid-with-items",
        orderNumber: "SIP-2611-005",
        token: "tok-valid",
        deliveryDate: "2026-11-14",
        totalAmount: 390,
        createdAt: "2026-11-13T19:00:00Z",
        items: [
          { productId: "prod-karakilcik", name: "Karakılçık Ekmeği", quantity: 2 },
          { productId: "prod-yogurt", name: "Jersey Ev Yoğurdu", quantity: 1 },
        ],
      },
    ];

    memoryStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

    const orders = readDeviceOrders();
    expect(orders).toHaveLength(2);
    expect(orders[0].id).toBe("legacy-1");
    expect(orders[0].items).toBeUndefined();
    expect(orders[1].id).toBe("valid-with-items");
    expect(orders[1].items).toEqual([
      { productId: "prod-karakilcik", name: "Karakılçık Ekmeği", quantity: 2 },
      { productId: "prod-yogurt", name: "Jersey Ev Yoğurdu", quantity: 1 },
    ]);

    expect(isDeviceOrder(raw[0])).toBe(true);
    expect(isDeviceOrder(raw[1])).toBe(false);
    expect(isDeviceOrder(raw[2])).toBe(true);
  });

  it("rememberDeviceOrder yeni siparişi items dizisiyle en başa ekler ve aynı id gelirse tekilleştirir", () => {
    const first: DeviceOrder = {
      id: "ord-1",
      orderNumber: "SIP-2611-001",
      token: "tok-1",
      deliveryDate: "2026-11-14",
      totalAmount: 180,
      createdAt: "2026-11-13T10:00:00Z",
      items: [{ productId: "p-1", name: "Köy Ekmeği", quantity: 1 }],
    };
    const second: DeviceOrder = {
      id: "ord-2",
      orderNumber: "SIP-2611-002",
      token: "tok-2",
      deliveryDate: "2026-11-15",
      totalAmount: 360,
      createdAt: "2026-11-13T15:00:00Z",
      items: [{ productId: "p-2", name: "Karakılçık Ekmeği", quantity: 2 }],
    };

    rememberDeviceOrder(first);
    rememberDeviceOrder(second);

    const list = readDeviceOrders();
    expect(list.map((o) => o.id)).toEqual(["ord-2", "ord-1"]);
    expect(list[0].items).toEqual([{ productId: "p-2", name: "Karakılçık Ekmeği", quantity: 2 }]);

    // Aynı id tekrar kaydedildiğinde başa taşınır, çiftlenmez
    rememberDeviceOrder({ ...first, totalAmount: 200 });
    const updatedList = readDeviceOrders();
    expect(updatedList).toHaveLength(2);
    expect(updatedList.map((o) => o.id)).toEqual(["ord-1", "ord-2"]);
    expect(updatedList[0].totalAmount).toBe(200);
  });

  it("updateDeviceOrderItems id veya orderNumber ile eşleşen kaydı sıralamayı bozmadan günceller", () => {
    rememberDeviceOrder({
      id: "ord-older",
      orderNumber: "SIP-2611-010",
      token: "tok-10",
      deliveryDate: "2026-11-10",
      totalAmount: 210,
      createdAt: "2026-11-09T09:00:00Z",
    });
    rememberDeviceOrder({
      id: "ord-newer",
      orderNumber: "SIP-2611-011",
      token: "tok-11",
      deliveryDate: "2026-11-12",
      totalAmount: 420,
      createdAt: "2026-11-11T09:00:00Z",
    });

    // orderNumber ile eski kaydın kalemlerini güncelle
    updateDeviceOrderItems("SIP-2611-010", [
      { productId: "prod-siyez", name: "Siyez Ekmeği", quantity: 1 },
    ]);

    const afterFirstUpdate = readDeviceOrders();
    expect(afterFirstUpdate.map((o) => o.id)).toEqual(["ord-newer", "ord-older"]);
    expect(afterFirstUpdate[0].items).toBeUndefined();
    expect(afterFirstUpdate[1].items).toEqual([
      { productId: "prod-siyez", name: "Siyez Ekmeği", quantity: 1 },
    ]);

    // id ile yeni kaydın kalemlerini güncelle
    updateDeviceOrderItems("ord-newer", [
      { productId: "prod-karakilcik", name: "Karakılçık Ekmeği", quantity: 2 },
    ]);

    const afterSecondUpdate = readDeviceOrders();
    expect(afterSecondUpdate.map((o) => o.id)).toEqual(["ord-newer", "ord-older"]);
    expect(afterSecondUpdate[0].items).toEqual([
      { productId: "prod-karakilcik", name: "Karakılçık Ekmeği", quantity: 2 },
    ]);

    // Eşleşmeyen id hiçbir şeyi bozmaz
    updateDeviceOrderItems("olmayan-id", [{ productId: "x", name: "X", quantity: 1 }]);
    expect(readDeviceOrders()).toEqual(afterSecondUpdate);
  });

  it("forgetDeviceOrders belirtilen id'leri siler", () => {
    rememberDeviceOrder({
      id: "ord-1",
      orderNumber: "SIP-2611-001",
      token: "tok-1",
      deliveryDate: "2026-11-14",
      totalAmount: 150,
      createdAt: "2026-11-13T10:00:00Z",
    });
    rememberDeviceOrder({
      id: "ord-2",
      orderNumber: "SIP-2611-002",
      token: "tok-2",
      deliveryDate: "2026-11-15",
      totalAmount: 300,
      createdAt: "2026-11-13T11:00:00Z",
    });

    forgetDeviceOrders(["ord-1"]);
    expect(readDeviceOrders().map((o) => o.id)).toEqual(["ord-2"]);
  });
});

describe("useCartStore.applyReorder (M-03C)", () => {
  const catalog: ExtendedProduct[] = [
    {
      id: "prod-karakilcik",
      name: "Karakılçık Ekmeği",
      description: "Taş değirmen unlu",
      price: 190,
      imageUrl: "/bread.webp",
      category: "bread",
      stock: 12,
      weight: 850,
      isActive: true,
      isAvailable: true,
    },
    {
      id: "prod-yogurt",
      name: "Jersey Ev Yoğurdu",
      description: "Doğal mandıra",
      price: 240,
      imageUrl: "/yogurt.webp",
      category: "pantry",
      stock: 8,
      weight: 1000,
      isActive: true,
      isAvailable: false, // Tükendi
    },
  ];

  beforeEach(() => {
    const memoryStorage = createMemoryStorage();
    vi.stubGlobal("window", {
      localStorage: memoryStorage,
      matchMedia: () => ({ matches: false }), // Mobil (< 768px) simülasyonu
    });
    vi.stubGlobal("localStorage", memoryStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mobilde (<768px) dahi eşleşen kalemleri güncel fiyatla sepete koyar, customerInfo'yu korur ve çekmeceyi açar", async () => {
    const { useCartStore } = await import("@/lib/store/useCartStore");
    useCartStore.setState({
      items: [],
      isOpen: false,
      customerInfo: {
        name: "Tahsin Usta",
        phone: "05551112233",
        neighborhood: "Barış",
        addressDetail: "Çiftlik Cad. No: 10",
        deliveryDate: "2026-11-16",
      },
    });

    const result = useCartStore.getState().applyReorder(catalog, [
      { productId: "prod-karakilcik", name: "Karakılçık Ekmeği", quantity: 2 },
      { productId: "prod-yogurt", name: "Jersey Ev Yoğurdu", quantity: 1 },
    ]);

    expect(result).toEqual({
      addedCount: 1,
      unavailableNames: ["Jersey Ev Yoğurdu"],
    });

    const state = useCartStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.items).toHaveLength(1);
    expect(state.items[0].productId).toBe("prod-karakilcik");
    expect(state.items[0].quantity).toBe(2);
    expect(state.items[0].price).toBe(190);
    expect(state.customerInfo.neighborhood).toBe("Barış");
    expect(state.customerInfo.name).toBe("Tahsin Usta");
  });

  it("productId boş olan eski kalemleri isimle eşleştirir; hiçbir aktif ürün yoksa çekmeceyi açmaz", async () => {
    const { useCartStore } = await import("@/lib/store/useCartStore");
    useCartStore.setState({ items: [], isOpen: false });

    const byNameResult = useCartStore.getState().applyReorder(catalog, [
      { productId: null, name: "Karakılçık Ekmeği", quantity: 3 },
    ]);
    expect(byNameResult).toEqual({ addedCount: 1, unavailableNames: [] });
    expect(useCartStore.getState().items[0].productId).toBe("prod-karakilcik");
    expect(useCartStore.getState().items[0].quantity).toBe(3);

    useCartStore.setState({ items: [], isOpen: false });
    const emptyResult = useCartStore.getState().applyReorder(catalog, [
      { productId: "prod-yogurt", name: "Jersey Ev Yoğurdu", quantity: 1 },
    ]);
    expect(emptyResult).toEqual({
      addedCount: 0,
      unavailableNames: ["Jersey Ev Yoğurdu"],
    });
    expect(useCartStore.getState().isOpen).toBe(false);
  });
});
