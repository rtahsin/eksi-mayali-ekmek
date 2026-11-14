import { describe, it, expect } from "vitest";
import { buildBakeDayReminderIcs, foldIcsLine } from "./bakeReminderIcs";

function unfoldIcs(ics: string): string {
  return ics.replace(/\r\n /g, "");
}

describe("buildBakeDayReminderIcs", () => {
  it("RFC 5545 CRLF satır sonları, Europe/Istanbul saat dilimi, RRULE ve 15 dk VALARM ile geçerli .ics üretir", () => {
    // 2026-10-05 Pazartesi 09:00 UTC -> 12:00 İstanbul
    const fixedNow = new Date("2026-10-05T09:00:00Z");
    const ics = buildBakeDayReminderIcs({
      weekday: "SA",
      hour: 10,
      minute: 30,
      note: "Cumartesi taş fırın somunu + manda yoğurdu",
      now: fixedNow,
    });

    // Tüm satırlar CRLF ile ayrılmalı, çıplak LF olmamalı
    expect(ics.endsWith("\r\n")).toBe(true);
    const withoutCrlf = ics.replace(/\r\n/g, "");
    expect(withoutCrlf.includes("\n")).toBe(false);

    // Her fiziksel satır en fazla 75 UTF-8 oktet olmalı (RFC 5545 §3.1)
    const encoder = new TextEncoder();
    for (const rawLine of ics.split("\r\n")) {
      expect(encoder.encode(rawLine).length).toBeLessThanOrEqual(75);
    }

    const unfolded = unfoldIcs(ics);
    expect(unfolded).toContain("BEGIN:VCALENDAR\r\n");
    expect(unfolded).toContain("VERSION:2.0\r\n");
    expect(unfolded).toContain("TZID:Europe/Istanbul\r\n");
    expect(unfolded).toContain("SUMMARY:EkmekLab Taş Fırın Sipariş Günü\r\n");
    expect(unfolded).toContain("RRULE:FREQ=WEEKLY;BYDAY=SA\r\n");
    expect(unfolded).toContain("DTSTART;TZID=Europe/Istanbul:20261010T103000\r\n");
    expect(unfolded).toContain("DTEND;TZID=Europe/Istanbul:20261010T110000\r\n");
    expect(unfolded).toContain("BEGIN:VALARM\r\n");
    expect(unfolded).toContain("TRIGGER:-PT15M\r\n");
    expect(unfolded).toContain("ACTION:DISPLAY\r\n");
    expect(unfolded).toContain("Cumartesi taş fırın somunu + manda yoğurdu");
    expect(unfolded).toContain("END:VCALENDAR\r\n");
  });

  it("aynı gün saat geçmişse bir sonraki haftanın aynı gününe planlar", () => {
    // 2026-10-05 Pazartesi 16:00 UTC -> 19:00 İstanbul
    const fixedNow = new Date("2026-10-05T16:00:00Z");
    const ics = buildBakeDayReminderIcs({
      weekday: "MO",
      hour: 18,
      minute: 0,
      note: "",
      now: fixedNow,
    });

    const unfolded = unfoldIcs(ics);
    expect(unfolded).toContain("DTSTART;TZID=Europe/Istanbul:20261012T180000\r\n");
    expect(unfolded).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO\r\n");
  });

  it("özel karakterleri (virgül, noktalı virgül, yeni satır) RFC 5545 kuralına göre kaçırır", () => {
    const fixedNow = new Date("2026-10-05T09:00:00Z");
    const ics = buildBakeDayReminderIcs({
      weekday: "WE",
      hour: 23,
      minute: 45,
      note: "Çavdar, Siyez; 2 adet\nKapıya bırakılsın",
      now: fixedNow,
    });

    const unfolded = unfoldIcs(ics);
    expect(unfolded).toContain("Çavdar\\, Siyez\\; 2 adet\\nKapıya bırakılsın");
    // 23:45 + 30 dk -> ertesi gün 00:15 taşmasını doğru hesaplar
    expect(unfolded).toContain("DTSTART;TZID=Europe/Istanbul:20261007T234500\r\n");
    expect(unfolded).toContain("DTEND;TZID=Europe/Istanbul:20261008T001500\r\n");
  });

  it("foldIcsLine çok baytlı Türkçe karakterleri bölmeden 75 oktet altında katlar", () => {
    const longTurkish =
      "DESCRIPTION:Şampiyon taş fırın ekmeği hatırlatıcısı — Çarşamba günü öğleden önce sipariş vermeyi unutma!";
    const folded = foldIcsLine(longTurkish);
    const encoder = new TextEncoder();
    for (const part of folded.split("\r\n")) {
      expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, "")).toBe(longTurkish);
  });
});
