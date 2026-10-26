import { describe, it, expect } from "vitest";
import { firinDurumu } from "./durum";

// İstanbul UTC+3. 2026-10-26 Pazartesi.
const ist = (tarih: string, saat: string) => new Date(`${tarih}T${saat}:00+03:00`);
const hepsi = [0, 1, 2, 3, 4, 5, 6];
const durum = (saat: string, sonCikis: string | null = null, openWeekdays = hepsi, closedDates: string[] = []) =>
  firinDurumu({ now: ist("2026-10-26", saat), sonCikis, openWeekdays, closedDates });

describe("girişteki fırın durumu", () => {
  it("kayıt yokken saate göre", () => {
    expect(durum("06:30")).toEqual({ yazi: "Fırın bugün 08:00'de açılıyor", acik: false });
    expect(durum("08:15")).toEqual({ yazi: "Fırın açık · ısınıyor", acik: true });
    expect(durum("09:20").yazi).toBe("İlk ekmekler fırında");
    expect(durum("14:00").yazi).toBe("Bugünün ekmekleri teslimatta");
    expect(durum("19:30")).toEqual({ yazi: "Fırın kapalı · yarın 08:00'de açılıyor", acik: false });
  });

  it("fırından çıktı kaydı saatiyle görünür", () => {
    const cikis = ist("2026-10-26", "10:40").toISOString();
    expect(durum("10:45", cikis).yazi).toBe("Bugün fırından çıktı · 10:40");
    expect(durum("15:00", cikis).yazi).toBe("Ekmekler teslimatta · fırından çıkış 10:40");
  });

  it("dünkü kayıt bugünü etkilemez", () => {
    const dun = ist("2026-10-25", "10:40").toISOString();
    expect(durum("09:30", dun).yazi).toBe("İlk ekmekler fırında");
  });

  it("kapalı günde sıradaki açık günü söyler", () => {
    // Pazartesi kapalı, Salı kapalı, Çarşamba açık
    expect(durum("10:00", null, [0, 3, 4, 5, 6]).yazi).toBe("Bugün fırın kapalı · Çarşamba 08:00'de açılıyor");
    // Tatil günü (closedDates) ve ertesi gün açık
    expect(durum("10:00", null, hepsi, ["2026-10-26"]).yazi).toBe("Bugün fırın kapalı · yarın 08:00'de açılıyor");
  });

  it("akşam, ertesi gün kapalıysa sonraki açık günü söyler", () => {
    // Salı kapalı
    expect(durum("20:00", null, [0, 1, 3, 4, 5, 6]).yazi).toBe("Fırın kapalı · Çarşamba 08:00'de açılıyor");
  });
});
