import { describe, expect, it } from "vitest";
import { getNavigationUrls, moveStop, routeRank, sortStops, waPhone } from "./maps";

describe("teslimat rota sırası", () => {
  it("mahalleyi Türkçe büyük/küçük harften bağımsız tanır", () => {
    expect(routeRank("YAKUPLU")).toBe(0);
    expect(routeRank("Barış Mah.")).toBe(2);
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
