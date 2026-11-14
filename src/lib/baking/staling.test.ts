import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  BREAD_STARCH_PROFILES,
  REHEAT_THERMAL_EXPLANATION,
  STARCH_PROFILE_META,
  STORAGE_MODES,
  STORAGE_MODE_META,
  inferBreadStarchProfile,
  simulateStalingCurve,
} from "./staling";
import { findHealthTerms, hasBenefitVerb } from "@/lib/knowledge/lint";

describe("staling physics engine (Avrami retrogradation & 200°C thermal revival)", () => {
  it("+4°C buzdolabında kristalleşme +20°C bez torbadan ve -18°C dondurucudan her zaman daha yüksektir", () => {
    for (const profile of BREAD_STARCH_PROFILES) {
      for (const hours of [12, 24, 48, 96, 168]) {
        const res = simulateStalingCurve({
          profile,
          hours,
          reheatAt200c: false,
        });

        const fridge = res.selected.fridge_4c;
        const linen = res.selected.linen_20c;
        const freezer = res.selected.freezer_m18c;

        expect(fridge.crystallinityPct).toBeGreaterThan(linen.crystallinityPct);
        expect(linen.crystallinityPct).toBeGreaterThan(freezer.crystallinityPct);

        expect(fridge.softnessScore).toBeLessThan(linen.softnessScore);
        expect(linen.softnessScore).toBeLessThan(freezer.softnessScore);
      }
    }
  });

  it("çavdar (pentozan ağı) buğdaya kıyasla daha yavaş kristalleşir ve atalık tahıl ikisinin arasındadır", () => {
    const wheat = simulateStalingCurve({
      profile: "wheat",
      hours: 72,
      reheatAt200c: false,
    });
    const ancient = simulateStalingCurve({
      profile: "ancient",
      hours: 72,
      reheatAt200c: false,
    });
    const rye = simulateStalingCurve({
      profile: "rye",
      hours: 72,
      reheatAt200c: false,
    });

    expect(rye.selected.linen_20c.crystallinityPct).toBeLessThan(
      ancient.selected.linen_20c.crystallinityPct
    );
    expect(ancient.selected.linen_20c.crystallinityPct).toBeLessThan(
      wheat.selected.linen_20c.crystallinityPct
    );
  });

  it("200°C'de 4 dk fırınlama (>60°C DSC eşiği) amilopektin kristallerini çözer ve yumuşaklığı geri kazandırır", () => {
    const stale = simulateStalingCurve({
      profile: "wheat",
      hours: 72,
      reheatAt200c: false,
    });
    const revived = simulateStalingCurve({
      profile: "wheat",
      hours: 72,
      reheatAt200c: true,
    });

    for (const mode of STORAGE_MODES) {
      expect(revived.selected[mode].crystallinityPct).toBeLessThan(
        stale.selected[mode].crystallinityPct * 0.25
      );
      expect(revived.selected[mode].meltedCrystalPct).toBeGreaterThan(0);
      expect(revived.selected[mode].softnessScore).toBeGreaterThan(
        stale.selected[mode].softnessScore
      );
      expect(revived.selected[mode].crustStateLabel).toContain("200°C");
    }
  });

  it("ilk bıçak dinlenme pencerelerini (Köy 3 sa, Siyez 24 sa, Çavdar 48 sa) doğru denetler", () => {
    expect(STARCH_PROFILE_META.wheat.restingHours).toBe(3);
    expect(STARCH_PROFILE_META.ancient.restingHours).toBe(24);
    expect(STARCH_PROFILE_META.rye.restingHours).toBe(48);

    const wheatEarly = simulateStalingCurve({
      profile: "wheat",
      hours: 2,
      reheatAt200c: false,
    });
    const wheatReady = simulateStalingCurve({
      profile: "wheat",
      hours: 3,
      reheatAt200c: false,
    });
    expect(wheatEarly.isWithinRestingWindow).toBe(true);
    expect(wheatEarly.restingWarning).not.toBeNull();
    expect(wheatReady.isWithinRestingWindow).toBe(false);
    expect(wheatReady.restingWarning).toBeNull();

    const ryeAt30h = simulateStalingCurve({
      profile: "rye",
      hours: 30,
      reheatAt200c: false,
    });
    expect(ryeAt30h.isWithinRestingWindow).toBe(true);
    expect(ryeAt30h.restingWarning?.remainingHours).toBe(18);
  });

  it("ürün nesnesinden doğru nişasta profilini (wheat / ancient / rye) çıkarır", () => {
    expect(
      inferBreadStarchProfile({
        name: "Mavi Haşhaşlı %100 Çavdar Ekmeği",
        category: "specialty",
      })
    ).toBe("rye");

    expect(
      inferBreadStarchProfile({
        name: "Gece Yarısı İmza Somunu",
        slug: "gece-yarisi",
      })
    ).toBe("rye");

    expect(
      inferBreadStarchProfile({
        name: "Taş Değirmen Siyez Ekmeği",
        flourTypes: ["%50 Siyez", "%50 Tam Buğday"],
      })
    ).toBe("ancient");

    expect(
      inferBreadStarchProfile({
        name: "Karakılçık Somunu",
        slug: "karakilcik-ekmegi",
      })
    ).toBe("ancient");

    expect(
      inferBreadStarchProfile({
        name: "Taş Fırın Köy Ekmeği",
        flourTypes: ["Taş Değirmen Tam Buğday", "Beyaz Ekmeklik Un"],
      })
    ).toBe("wheat");
  });

  it("K006 sıfır sağlık beyanı: tüm açıklama ve etiket metinlerinde HEALTH_TERMS ve BENEFIT_VERBS sıfırdır", () => {
    const texts: string[] = [REHEAT_THERMAL_EXPLANATION];

    for (const mode of STORAGE_MODES) {
      const m = STORAGE_MODE_META[mode];
      texts.push(m.label, m.shortLabel, m.mechanismNote);
    }

    for (const profile of BREAD_STARCH_PROFILES) {
      const p = STARCH_PROFILE_META[profile];
      texts.push(
        p.label,
        p.shortLabel,
        p.subtitle,
        p.restingWarningTitle,
        p.restingWarningBody,
        p.matrixChemistryNote
      );

      for (const reheat of [false, true]) {
        const sim = simulateStalingCurve({
          profile,
          hours: 2,
          reheatAt200c: reheat,
        });
        if (sim.restingWarning) {
          texts.push(sim.restingWarning.title, sim.restingWarning.body);
        }
        for (const mode of STORAGE_MODES) {
          for (const pt of sim.series[mode]) {
            texts.push(pt.crustStateLabel);
          }
        }
      }
    }

    for (const text of texts) {
      expect(findHealthTerms(text), `Sağlık terimi bulundu: "${text}"`).toEqual([]);
      expect(hasBenefitVerb(text), `Fayda fiili bulundu: "${text}"`).toBe(false);
    }
  });

  it("M-04D vitrin ve bilim UI bileşenlerinde K006 ihlali ve <Sparkles /> ikonu bulunmaz", () => {
    const uiFiles = [
      "src/components/bilim/StalingSimulator.tsx",
      "src/components/bilim/Kopru.tsx",
      "src/components/bilim/levha/deney/RafDeneyi.tsx",
      "src/components/storefront/BatchPassport.tsx",
      "src/components/storefront/HowWeBake.tsx",
      "src/components/storefront/ScienceDiscoveryBridge.tsx",
      "src/components/storefront/ProductDetailClientActions.tsx",
      "src/app/urun/[slug]/page.tsx",
      "src/app/arac/page.tsx",
    ];

    for (const relPath of uiFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const source = fs.readFileSync(fullPath, "utf8");

      expect(source.includes("Sparkles"), `${relPath} içinde Sparkles bulundu`).toBe(
        false
      );
      expect(
        findHealthTerms(source),
        `${relPath} içinde sağlık terimi bulundu`
      ).toEqual([]);
      expect(
        hasBenefitVerb(source),
        `${relPath} içinde fayda fiili bulundu`
      ).toBe(false);
    }
  });
});
