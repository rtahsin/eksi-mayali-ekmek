import { describe, expect, it } from "vitest";
import { ekmeginAnlari } from "./kopru";

// Kayıtlar canlı katalogdaki ürünlerin içindekiler ve un cinsi alanlarıdır (24 Eki).
const KOY = {
  ingredients: ["Taş Değirmen Atalık Un", "Su", "8 Yıllık Ekşi Maya", "Çankırı Kaya Tuzu"],
  flourTypes: ["Taş Değirmen Atalık Buğday", "Karakılçık"],
};
const SIYEZ = {
  ingredients: ["Kastamonu Siyez Unu", "İçme Suyu", "Canlı Ekşi Maya", "Kaya Tuzu"],
  flourTypes: ["Kastamonu Atalık Siyez"],
};
const CEVIZLI = {
  ingredients: ["Kavrulmuş Ceviz İçi", "Siyez Unu", "Karabuğday Unu", "Çavdar Unu", "Su", "Ekşi Maya", "Kaya Tuzu"],
  flourTypes: ["Siyez", "Karabuğday", "Çavdar"],
};

describe("ekmeginAnlari", () => {
  it("ekşi maya geçmeyen ürüne köprü kurmaz", () => {
    expect(ekmeginAnlari({ ingredients: ["%100 Doğal Mera Çiğ Sütü", "Geleneksel Canlı Yoğurt Mayası"] })).toEqual([]);
    expect(ekmeginAnlari({})).toEqual([]);
  });

  it("taş değirmen ve atalık buğday kaydı olan ekmeğe değirmen ve hasat anlarını ekler", () => {
    expect(ekmeginAnlari(KOY)).toEqual([
      "olgun_tanenin_ici",
      "atalik_bugdayin_hasadi",
      "degirmen_tasinda",
      "su_ve_tuz_bulusunca",
      "yogurma_tezgahinda",
      "eksi_mayanin_ilk_10_gunu",
      "gaz_ve_kabarma",
      "asitler_ve_ph",
      "firinin_ilk_8_dakikasi",
      "kabugun_kizarmasi",
      "rafta_ilk_hafta",
    ]);
  });

  it("kayıtta taş değirmen geçmiyorsa değirmen anını eklemez", () => {
    expect(ekmeginAnlari(SIYEZ)).toContain("atalik_bugdayin_hasadi");
    expect(ekmeginAnlari(SIYEZ)).not.toContain("degirmen_tasinda");
  });

  it("çavdar unu olan ekmeğe çavdar anını ekler; karabuğdayı buğday saymaz", () => {
    expect(ekmeginAnlari(CEVIZLI)).toContain("cavdar_unu_suyla_bulusunca");
    expect(ekmeginAnlari({ ingredients: ["Karabuğday Unu", "Ekşi Maya"] })).not.toContain("olgun_tanenin_ici");
  });

  it("admin'deki yazım farklarını aynı sayar", () => {
    expect(ekmeginAnlari({ ingredients: ["Tam buğday unu", "EKŞİMAYA", "Tuz"], flourTypes: ["Taşdeğirmen"] })).toEqual(
      expect.arrayContaining(["olgun_tanenin_ici", "degirmen_tasinda", "kepek_una_karisinca", "su_ve_tuz_bulusunca"])
    );
  });

  it("kayıtta olmayan yöntemi varsaymaz", () => {
    for (const u of [KOY, SIYEZ, CEVIZLI]) {
      expect(ekmeginAnlari(u)).not.toContain("gece_dolapta");
      expect(ekmeginAnlari(u)).not.toContain("kesik_atilinca");
    }
  });
});
