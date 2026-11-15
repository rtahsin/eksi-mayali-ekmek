import { describe, expect, it } from "vitest";
import {
  BEYLIKDUZU_ROUTE_ORDER,
  clusterOrdersByNeighborhood,
  getNavigationUrls,
  moveStop,
  routeRank,
  sortStops,
  waPhone,
} from "./maps";

describe("teslimat rota sırası", () => {
  it("mahalleyi Türkçe büyük/küçük harften bağımsız tanır ve Beykent sırasını içerir", () => {
    expect(routeRank("YAKUPLU")).toBe(0);
    expect(routeRank("Barış Mah.")).toBe(2);
    expect(BEYLIKDUZU_ROUTE_ORDER).toContain("Beykent");
    expect(routeRank("Beykent")).toBeGreaterThanOrEqual(0);
    expect(routeRank("Beykent")).toBeLessThan(BEYLIKDUZU_ROUTE_ORDER.length);
    expect(routeRank("Bilinmeyen")).toBeGreaterThan(5);
  });

  it("elle sıra önce, kalanlar mahalle sırasıyla", () => {
    const stops = [
      { id: "a", neighborhood: "Sahil" },
      { id: "b", neighborhood: "Yakuplu" },
      { id: "c", neighborhood: "Barış" },
    ];
    expect(sortStops(stops).map((s) => s.id)).toEqual(["b", "c", "a"]);
    expect(sortStops(stops, ["a", "silinmis"]).map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("durak taşıma sınırlarda bir şey yapmaz", () => {
    expect(moveStop(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveStop(["a", "b", "c"], "a", "up")).toEqual(["a", "b", "c"]);
    expect(moveStop(["a", "b", "c"], "c", "down")).toEqual(["a", "b", "c"]);
  });
});

describe("iletişim ve navigasyon", () => {
  it("telefonu wa.me biçimine çevirir", () => {
    expect(waPhone("0532 123 45 67")).toBe("905321234567");
    expect(waPhone("+90 532 123 45 67")).toBe("905321234567");
    expect(waPhone("5321234567")).toBe("905321234567");
    expect(waPhone("123")).toBeNull();
  });

  it("konum varsa koordinata, yoksa adres aramasına gider", () => {
    expect(getNavigationUrls("Barış Mah. 1. Sk", 41.0, 28.6)).toMatchObject({ hasCoordinates: true });
    const byText = getNavigationUrls("Barış Mah. 1. Sk");
    expect(byText.hasCoordinates).toBe(false);
    expect(byText.google).toContain(encodeURIComponent("Barış Mah. 1. Sk, Beylikdüzü"));
  });
});

describe("mahalle ve apartman kümeleme", () => {
  it("siparişleri rota sırasına göre kümeler, pickup ve terminalleri hariç tutar", () => {
    const clusters = clusterOrdersByNeighborhood([
      {
        id: "o-adnan",
        neighborhood: "Adnan Kahveci",
        deliveryAddress: "Yavuz Sultan Selim Blv. No:4 D:1",
        deliveryMethod: "courier",
        status: "hazirlaniyor",
        courierId: null,
        items: [{ quantity: 2 }, { quantity: 1 }],
      },
      {
        id: "o-yakuplu",
        neighborhood: "Yakuplu",
        deliveryAddress: "Hürriyet Blv. No:12 D:3",
        deliveryMethod: "courier",
        status: "firinda",
        courierId: "c1",
        items: [{ quantity: 4 }],
      },
      {
        id: "o-beykent",
        neighborhood: "Beykent",
        deliveryAddress: "Büyükşehir Cd. No:8",
        deliveryMethod: "courier",
        status: "bekliyor",
        courierId: null,
        items: [{ quantity: 2 }],
      },
      {
        id: "o-unspecified",
        neighborhood: "",
        deliveryAddress: "Özel Adres",
        deliveryMethod: "courier",
        status: "bekliyor",
        courierId: null,
        items: [{ quantity: 1 }],
      },
      {
        id: "o-pickup",
        neighborhood: "Yakuplu",
        deliveryAddress: "Gel-Al",
        deliveryMethod: "pickup",
        status: "firinda",
        courierId: null,
        items: [{ quantity: 3 }],
      },
      {
        id: "o-delivered",
        neighborhood: "Barış",
        deliveryAddress: "Teslim edildi",
        deliveryMethod: "courier",
        status: "teslim_edildi",
        courierId: "c1",
        items: [{ quantity: 2 }],
      },
    ]);

    expect(clusters.map((c) => c.neighborhood)).toEqual([
      "Yakuplu",
      "Beykent",
      "Adnan Kahveci",
      "Diğer / Belirtilmemiş",
    ]);

    expect(clusters[0]).toMatchObject({
      neighborhood: "Yakuplu",
      orderIds: ["o-yakuplu"],
      unassignedOrderIds: [],
      totalOrders: 1,
      totalUnits: 4,
      unassignedCount: 0,
    });
    expect(clusters[2]).toMatchObject({
      neighborhood: "Adnan Kahveci",
      orderIds: ["o-adnan"],
      unassignedOrderIds: ["o-adnan"],
      totalOrders: 1,
      totalUnits: 3,
      unassignedCount: 1,
    });
  });

  it("aynı apartman/site içindeki farklı daire ve kat eklerini aynı binada kümeleyip farklı binaları ayırır", () => {
    const clusters = clusterOrdersByNeighborhood([
      {
        id: "b1",
        neighborhood: "Cumhuriyet",
        deliveryAddress: "1998. Sk. Bizimkent Sitesi B2 Blok Kat: 3 D:12 [📍 GPS: 41.0, 28.6]",
        deliveryMethod: "courier",
        status: "firinda",
        courierId: null,
        items: [{ quantity: 1 }],
      },
      {
        id: "b2",
        neighborhood: "Cumhuriyet Mah.",
        deliveryAddress: "1998. Sokak Bizimkent Sitesi B2 Blok Daire 5 İç Kapı 5",
        deliveryMethod: "courier",
        status: "hazirlaniyor",
        courierId: null,
        items: [{ quantity: 2 }],
      },
      {
        id: "b3",
        neighborhood: "Cumhuriyet",
        deliveryAddress: "1998. Sk. Bizimkent Sitesi B2 Blok No:8/14",
        deliveryMethod: "courier",
        status: "bekliyor",
        courierId: "c2",
        items: [{ quantity: 1 }],
      },
      {
        id: "c1",
        neighborhood: "Cumhuriyet",
        deliveryAddress: "1998. Sk. Bizimkent Sitesi A1 Blok D:2",
        deliveryMethod: "courier",
        status: "firinda",
        courierId: null,
        items: [{ quantity: 1 }],
      },
    ]);

    // b1 ve b2 aynı gövdede toplanır; b3 ("No:8") ve c1 ("A1 Blok") tekil olduğu için küme dışı kalır
    expect(clusters).toHaveLength(1);
    expect(clusters[0].totalOrders).toBe(4);
    expect(clusters[0].unassignedOrderIds).toEqual(["b1", "b2", "c1"]);
    expect(clusters[0].buildingClusters).toHaveLength(1);
    expect(clusters[0].buildingClusters[0].orderIds).toEqual(["b1", "b2"]);
    expect(clusters[0].buildingClusters[0].count).toBe(2);
  });
});
