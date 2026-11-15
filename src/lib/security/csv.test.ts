import { describe, expect, it } from "vitest";
import { buildCsvContent, sanitizeCsvCell } from "./csv";

describe("CSV formül enjeksiyon koruması ve Excel-TR biçimi", () => {
  it("tehlikeli formül öneklerinin başına tek tırnak ekler", () => {
    expect(sanitizeCsvCell("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
    expect(sanitizeCsvCell("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
    expect(sanitizeCsvCell("-100")).toBe("'-100");
    expect(sanitizeCsvCell("@SUM(1+1)*cmd")).toBe("'@SUM(1+1)*cmd");
    expect(sanitizeCsvCell("\t=1+1")).toBe("'\t=1+1");
    expect(sanitizeCsvCell("\r=1+1")).toBe('"\'\r=1+1"');
    expect(sanitizeCsvCell(" =1+1")).toBe("' =1+1");
  });

  it("noktalı virgül, çift tırnak ve yeni satırları RFC 4180 uyumlu kaçar", () => {
    expect(sanitizeCsvCell('Ekşi; "Taş Fırın"')).toBe('"Ekşi; ""Taş Fırın"""');
    expect(sanitizeCsvCell("Satır 1\nSatır 2")).toBe('"Satır 1\nSatır 2"');
    expect(sanitizeCsvCell("=HYPERLINK(\"http://a\";\"b\")")).toBe(
      '"\'=HYPERLINK(""http://a"";""b"")"'
    );
  });

  it("null/undefined değerleri boş dizgeye çevirir ve normal Türkçe metni korur", () => {
    expect(sanitizeCsvCell(null)).toBe("");
    expect(sanitizeCsvCell(undefined)).toBe("");
    expect(sanitizeCsvCell(42)).toBe("42");
    expect(sanitizeCsvCell("Çankırı Kaya Tuzu 800g")).toBe("Çankırı Kaya Tuzu 800g");
  });

  it("buildCsvContent UTF-8 BOM ile başlar, noktalı virgül ve CRLF kullanır", () => {
    const csv = buildCsvContent(
      ["Müşteri", "Not", "Tutar"],
      [
        ["Ayşe Şahin", "=1+1", 250],
        ["Ofsüt; Şube", 'Not "Özel"', 1200],
      ]
    );

    expect(csv.startsWith("\uFEFF")).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines).toEqual([
      "Müşteri;Not;Tutar",
      "Ayşe Şahin;'=1+1;250",
      '"Ofsüt; Şube";"Not ""Özel""";1200',
    ]);
  });
});
