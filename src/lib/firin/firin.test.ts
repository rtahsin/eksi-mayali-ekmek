import { describe, it, expect } from "vitest";
import type { ExtendedProduct } from "@/types";
import { FIRIN_CIZELGESI, firinAniSirasi, selam } from "./durum";
import { tezgahDurumu, urunSatilirMi } from "./tezgah";

// İstanbul UTC+3; saatler UTC olarak verilir.
const ist = (tarih: string, saat: string) => new Date(`${tarih}T${saat}:00+03:00`);

const ekmek = (p: Partial<ExtendedProduct> = {}): ExtendedProduct => ({
  id: "p1",
  name: "Karakılçık",
  description: "",
  price: 100,
  imageUrl: "",
  category: "bread",
  stock: 0,
  weight: 750,
  ...p,
});

// 2026-10-26 Pazartesi
const gunler = (...d: string[]) => d.map((date) => ({ date, label: date }));

describe("fırın anı", () => {
  it("saate göre doğru anı seçer", () => {
    expect(FIRIN_CIZELGESI[firinAniSirasi(ist("2026-10-26", "04:30"))].ad).toBe("ateş");
    expect(FIRIN_CIZELGESI[firinAniSirasi(ist("2026-10-26", "07:00"))].ad).toBe("çıkış");
    expect(FIRIN_CIZELGESI[firinAniSirasi(ist("2026-10-26", "13:00"))].ad).toBe("hamur");
    expect(FIRIN_CIZELGESI[firinAniSirasi(ist("2026-10-26", "15:30"))].ad).toBe("dağıtım");
    expect(FIRIN_CIZELGESI[firinAniSirasi(ist("2026-10-26", "23:10"))].ad).toBe("dinlenme");
  });

  it("gece yarısından ilk ateşe kadar dinlenme sürer", () => {
    expect(FIRIN_CIZELGESI[firinAniSirasi(ist("2026-10-26", "02:15"))].ad).toBe("dinlenme");
  });

  it("selam saate göre değişir", () => {
    expect(selam(ist("2026-10-26", "06:00"))).toBe("Hayırlı sabahlar");
    expect(selam(ist("2026-10-26", "14:00"))).toBe("İyi günler");
    expect(selam(ist("2026-10-26", "21:00"))).toBe("İyi akşamlar");
    expect(selam(ist("2026-10-26", "01:54"))).toBe("İyi geceler");
  });
});

describe("tezgâh durumu", () => {
  const now = ist("2026-10-26", "14:00");

  it("her gün ekmeği ilk teslim gününde var", () => {
    expect(tezgahDurumu(ekmek(), gunler("2026-10-27", "2026-10-28"), now)).toEqual({ gun: "2026-10-27", yazi: "yarın var", yakin: true });
    expect(tezgahDurumu(ekmek(), gunler("2026-10-26"), now).yazi).toBe("bugün var");
  });

  it("haftanın günlerine bağlı ekmek sıradaki gününü söyler", () => {
    // 4 = Perşembe
    const p = ekmek({ saleWeekdays: [4] });
    expect(tezgahDurumu(p, gunler("2026-10-27", "2026-10-28", "2026-10-29"), now)).toEqual({ gun: "2026-10-29", yazi: "sıradaki Perşembe", yakin: false });
  });

  it("satış tarihli ürün yalnız o tarihlerde satılır", () => {
    const p = ekmek({ availability: "dates", saleDates: [{ date: "2026-10-28", limit: null }] });
    expect(urunSatilirMi(p, "2026-10-27", "2026-10-26")).toBe(false);
    expect(urunSatilirMi(p, "2026-10-28", "2026-10-26")).toBe(true);
  });

  it("önceden sipariş süresine uyar", () => {
    const p = ekmek({ leadTimeDays: 2 });
    expect(tezgahDurumu(p, gunler("2026-10-27", "2026-10-28"), now).gun).toBe("2026-10-28");
  });

  it("satışta değilse ya da gün yoksa bunu söyler", () => {
    expect(tezgahDurumu(ekmek({ isAvailable: false }), gunler("2026-10-27"), now).yazi).toBe("şimdilik yok");
    expect(tezgahDurumu(ekmek(), [], now).yazi).toBe("yakında yeniden");
  });
});
