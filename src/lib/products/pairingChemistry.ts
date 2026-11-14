/**
 * EkmekLab — Ekmek × Mandıra/Şarküteri Fizikokimyasal & Duyusal Eşleşme Motoru (M-04D)
 *
 * Not: Bu dosya `catalog` modülündedir (`arch.test.ts`). Yalnızca `kernel`, `supabase`,
 * `utils`, `ordering`, `@/types` ve aynı dizindeki `./grouping` modüllerini içe aktarabilir.
 * Tüm metinler K006 (sıfır sağlık vaadi) ilkesine göre yalnızca gıda fiziği, kimyası ve
 * duyusal doku etkileşimlerini anlatır.
 */

import type { ExtendedProduct } from "@/types";
import { isAccompaniment } from "./grouping";

export type CulinaryArchetype =
  | "milk"
  | "yogurt"
  | "butter"
  | "cheese"
  | "sucuk"
  | "egg"
  | "kavurma"
  | "olive_spread"
  | "pantry_other"
  | "bread_rye"
  | "bread_ancient"
  | "bread_toast"
  | "bread_wheat";

export interface SmartPairingItem {
  product: ExtendedProduct;
  chemistryLabel: string;
  chemistryNote: string;
  isCrossCategory: boolean;
}

function normalizeAsciiTr(input: string): string {
  return input
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

export function classifyCulinaryArchetype(
  product: ExtendedProduct
): CulinaryArchetype {
  const text = normalizeAsciiTr(
    [
      product.category ?? "",
      product.name ?? "",
      product.slug ?? "",
      ...(product.flourTypes ?? []),
      ...(product.ingredients ?? []),
    ].join(" ")
  );

  if (isAccompaniment(product)) {
    if (text.includes("yogurt")) return "yogurt";
    if (text.includes("sut") || text.includes("jersey")) return "milk";
    if (text.includes("tereyag") || text.includes("kaymak")) return "butter";
    if (
      text.includes("peynir") ||
      text.includes("tulum") ||
      text.includes("ezine") ||
      text.includes("kasar")
    ) {
      return "cheese";
    }
    if (text.includes("sucuk")) return "sucuk";
    if (text.includes("yumurta")) return "egg";
    if (text.includes("kavurma") || text.includes("pastirma")) return "kavurma";
    if (
      text.includes("zeytin") ||
      text.includes("recel") ||
      text.includes("bal") ||
      text.includes("tahin")
    ) {
      return "olive_spread";
    }
    return "pantry_other";
  }

  if (
    text.includes("cavdar") ||
    text.includes("rye") ||
    text.includes("gece yarisi") ||
    text.includes("gece-yarisi")
  ) {
    return "bread_rye";
  }
  if (
    text.includes("siyez") ||
    text.includes("karakilcik") ||
    text.includes("kavilca") ||
    text.includes("emmer") ||
    text.includes("atalik")
  ) {
    return "bread_ancient";
  }
  if (text.includes("tost") || text.includes("yudane")) {
    return "bread_toast";
  }
  return "bread_wheat";
}

function isBreadArchetype(a: CulinaryArchetype): boolean {
  return a.startsWith("bread_");
}

function buildChemistryForPair(
  breadArch: CulinaryArchetype,
  accArch: CulinaryArchetype
): { label: string; note: string } {
  switch (accArch) {
    case "milk":
      return {
        label: "Süt Lipidi × Organik Asit Dengesi",
        note: "Süt yağı emülsiyonu ve kazein proteinleri, pH ~4,3 ekşi maya organik asitlerinin keskinliğini damakta yuvarlar; sıcak kabuktaki Maillard aromalarıyla katman kurar.",
      };
    case "yogurt":
      return {
        label: "Çift Laktik Fermantasyon Uyumu",
        note: "Ev yoğurdunun laktik asit jeli ile ekşi mayalı iç dokunun uçucu fermantasyon esterleri aynı aromatik ailede buluşur; kalın kabuk yoğun kıvamı dağılmadan taşır.",
      };
    case "butter":
      if (breadArch === "bread_rye") {
        return {
          label: "Pentozan Jeli × Tereyağı Fazı",
          note: "Çavdarın sıkı arabinoksilan ağı ve kavruk kabuk notaları, oda ısısında yumuşayan süt yağı globülleriyle birleşerek ekşi asetik tonları dengeler.",
        };
      }
      return {
        label: "Sıcak Gözenek × 32°C Erime Fazı",
        note: "Kızarmış gözenek duvarlarında ~32°C'de eriyen tereyağı lipitleri, kabuktaki yağda çözünen pirazin ve furan koku moleküllerini damağa yayar.",
      };
    case "cheese":
      return {
        label: "Kazein Umamisi × Kabuk Karamelizasyonu",
        note: "Olgun peynirdeki serbest amino asitler ve tuz kristalleri, taş tabanda esmerleşen kabuğun kavruk şeker-protein bileşikleriyle tat kontrastı kurar.",
      };
    case "sucuk":
      return {
        label: "Maillard Kabuk × Fermente Lipit Taşıyıcısı",
        note: "Taş tabanda karamelize kabuk dokusu ve esnek gözenek duvarları, tavada eriyen fermente sucuk ve baharat lipit fazını hamurlaşmadan taşır.",
      };
    case "egg":
      return {
        label: "Jelatinleşmiş Gözenek × Sarı Emülsiyonu",
        note: "Yüksek su oranıyla pişen açık gözenekli ekmek içi, akışkan yumurta sarısının lesitince zengin emülsiyonunu gözenek yüzeylerinde tutar.",
      };
    case "kavurma":
      if (breadArch === "bread_rye") {
        return {
          label: "Yoğun Çavdar Matrisi × Et Yağı Dengesi",
          note: "48 saat dinlenmiş sıkı çavdar dilimi ve aromatik asit profili, sıcak kavurmanın eriyen hayvansal yağ fazını keskin bir dengeyle tamamlar.",
        };
      }
      return {
        label: "Taş Taban Kabuğu × Sıcak Kollajen Fazı",
        note: "Kalın taş fırın kabuğu ve dirençli gluten ağı, ısıyla çözünen kavurma yağını ve et suyunu dilim bütünlüğünü yitirmeden emer.",
      };
    case "olive_spread":
      return {
        label: "Meyvemsi Polifenol × Tahıl Aroması",
        note: "Zeytin ve kahvaltılık ezme yağları, taş değirmen ununun kepek katmanından gelen kavruk tahıl kokularını damakta uzun süre tutar.",
      };
    default:
      return {
        label: "Taş Fırın Kabuğu × Sofralık Eşlikçi",
        note: "Uzun soğuk fermantasyonla gelişen organik asit ve kabuk aromaları, doğal mandıra ve şarküteri dokularıyla dengeli bir lokma yapısı kurar.",
      };
  }
}

export function describePairingChemistry(
  source: ExtendedProduct,
  target: ExtendedProduct
): { label: string; note: string } {
  const sourceArch = classifyCulinaryArchetype(source);
  const targetArch = classifyCulinaryArchetype(target);

  if (isBreadArchetype(sourceArch) && !isBreadArchetype(targetArch)) {
    return buildChemistryForPair(sourceArch, targetArch);
  }

  if (!isBreadArchetype(sourceArch) && isBreadArchetype(targetArch)) {
    return buildChemistryForPair(targetArch, sourceArch);
  }

  if (isBreadArchetype(sourceArch) && isBreadArchetype(targetArch)) {
    if (targetArch === "bread_rye") {
      return {
        label: "Pentozan Jeli × Farklı Dilim Dokusu",
        note: "Buğdayın açık gözenekli gluten ağının yanına pentozan jelli sıkı çavdar somunu eklemek, sofrada iki ayrı kabuk ve iç doku karakteri sunar.",
      };
    }
    if (targetArch === "bread_ancient") {
      return {
        label: "Karotenoidli Atalık Tahıl Kontrastı",
        note: "Lutein pigmentli altın sarı atalık buğday içi ve kendine özgü kavruk aroması, klasik taş değirmen somunlarıyla zengin bir tadım dizisi kurar.",
      };
    }
    return {
      label: "Taş Taban & Hidrasyon Çeşitliliği",
      note: "Farklı un harmanı ve su oranıyla yoğrulan bu somun, günün farklı öğünleri ve tost/kahvaltı hazırlıkları için tamamlayıcı doku sunar.",
    };
  }

  // İkisi de eşlikçi ise (ör. sucuk + yumurta, süt + tereyağı)
  if (
    (sourceArch === "sucuk" && targetArch === "egg") ||
    (sourceArch === "egg" && targetArch === "sucuk")
  ) {
    return {
      label: "Tava Isısında Lipit & Protein Uyumu",
      note: "2018 gece yarısı klasiği: tavada eriyen fermente sucuk yağı, yumurta proteinleriyle birleşerek sıcak taş fırın ekmeği için yoğun bir sos tabanı kurar.",
    };
  }

  return {
    label: "Sofralık Mandıra & Şarküteri Uyumu",
    note: "Aynı teslimat sepetinde taze taş fırın somunlarının yanında kahvaltı ve akşam sofrasını tamamlayan doğal üretici seçkisi.",
  };
}

function affinityBonus(
  sourceArch: CulinaryArchetype,
  targetArch: CulinaryArchetype
): number {
  if (sourceArch === "bread_rye") {
    if (targetArch === "butter" || targetArch === "kavurma" || targetArch === "cheese") {
      return 30;
    }
  }
  if (sourceArch === "bread_wheat" || sourceArch === "bread_ancient") {
    if (
      targetArch === "sucuk" ||
      targetArch === "egg" ||
      targetArch === "milk" ||
      targetArch === "butter" ||
      targetArch === "yogurt"
    ) {
      return 25;
    }
  }
  if (sourceArch === "kavurma" || sourceArch === "butter") {
    if (targetArch === "bread_rye" || targetArch === "bread_wheat") {
      return 30;
    }
  }
  if (sourceArch === "sucuk" || sourceArch === "egg") {
    if (targetArch === "bread_wheat" || targetArch === "bread_ancient") {
      return 30;
    }
  }
  if (sourceArch === "milk" || sourceArch === "yogurt") {
    if (targetArch === "bread_wheat" || targetArch === "bread_toast" || targetArch === "bread_ancient") {
      return 25;
    }
  }
  return 0;
}

/**
 * Ürün sayfasında rastgele `.slice(0, 4)` yerine:
 * - Ekmek ise önce aktif Eşlikçileri (`isAccompaniment`), yetmezse diğer ekmekleri;
 * - Eşlikçi ise önce aktif Taş Fırın Ekmeklerini, yetmezse diğer eşlikçileri seçer.
 * Her eşleşmeye K006 uyumlu fizikokimyasal & duyusal not üretir.
 */
export function getSmartPairings(
  product: ExtendedProduct,
  allProducts: readonly ExtendedProduct[],
  limit: number = 4
): SmartPairingItem[] {
  if (limit <= 0) return [];

  const sourceIsAccompaniment = isAccompaniment(product);
  const sourceArch = classifyCulinaryArchetype(product);
  const crossSellSet = new Set(product.crossSell ?? []);

  const candidates = allProducts.filter(
    (p) => p.id !== product.id && p.isActive !== false
  );

  const scoreCandidate = (candidate: ExtendedProduct): number => {
    let score = 0;
    const candIsAccompaniment = isAccompaniment(candidate);
    const candArch = classifyCulinaryArchetype(candidate);

    // 1. Ana kural: Ekmek <-> Eşlikçi çapraz kategori önceliği
    if (sourceIsAccompaniment !== candIsAccompaniment) {
      score += 1000;
    }

    // 2. Stokta mevcut olanlar tükenenlerin önüne geçer
    if (candidate.isAvailable !== false) {
      score += 200;
    }

    // 3. Admin tarafından açıkça crossSell işaretlenmiş olanlar
    if (crossSellSet.has(candidate.id)) {
      score += 100;
    }

    // 4. Fizikokimyasal arketip uyumu
    score += affinityBonus(sourceArch, candArch);

    // 5. Popülerlik
    if (candidate.isPopular) {
      score += 10;
    }

    return score;
  };

  const sorted = [...candidates].sort((a, b) => {
    const diff = scoreCandidate(b) - scoreCandidate(a);
    if (diff !== 0) return diff;
    const orderA = a.displayOrder ?? 0;
    const orderB = b.displayOrder ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || "").localeCompare(b.name || "", "tr");
  });

  return sorted.slice(0, limit).map((target) => {
    const chem = describePairingChemistry(product, target);
    return {
      product: target,
      chemistryLabel: chem.label,
      chemistryNote: chem.note,
      isCrossCategory: sourceIsAccompaniment !== isAccompaniment(target),
    };
  });
}
