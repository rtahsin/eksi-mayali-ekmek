import type { ExtendedProduct } from "@/types";
import { isAccompaniment, isAccompanimentCategory } from "./grouping";

export type AllergenLabel =
  | "Gluten içeren tahıllar"
  | "Süt ve süt ürünleri (laktoz dahil)"
  | "Yumurta"
  | "Sert kabuklu meyveler"
  | "Susam";

export interface FoodComplianceProductInput {
  id?: string;
  productId?: string;
  name?: string | null;
  slug?: string | null;
  category?: string | null;
  description?: string | null;
  ingredients?: readonly string[] | null;
  flourTypes?: readonly string[] | null;
  capacityUnits?: number | null;
}

export interface FoodComplianceSummary {
  isRawMilk: boolean;
  rawMilkHeadline: string | null;
  rawMilkDetail: string | null;
  allergens: AllergenLabel[];
  crossContactNote: string;
  defaultStorage: string;
}

export const RAW_MILK_HEADLINE = "ÇİĞ SÜTTÜR — KULLANMADAN ÖNCE KAYNATINIZ";
export const RAW_MILK_DETAIL =
  "0°C İLA +4°C'DE BUZDOLABINDA MUHAFAZA EDİNİZ · 24 SAAT İÇİNDE TÜKETİNİZ";

export const CROSS_CONTACT_NOTE =
  "Atölyemizde gluten içeren taş değirmen unları, süt ürünleri, yumurta, susam ve ceviz işlenen tezgâhlarda iz miktarda çapraz temas bulunabilir.";

export const RAW_MILK_STORAGE_GUIDANCE =
  "+0°C ila +4°C buzdolabında soğuk zincirde muhafaza ediniz. Çiğ süttür; tüketmeden önce mutlaka kaynatınız ve 24 saat içinde tüketiniz.";

export const COLD_CHAIN_ACCOMPANIMENT_STORAGE_GUIDANCE =
  "+0°C ila +4°C buzdolabında muhafaza ediniz; ambalaj üzerindeki tavsiye edilen tüketim tarihine uyunuz.";

export const DRY_PANTRY_ACCOMPANIMENT_STORAGE_GUIDANCE =
  "Serin ve kuru ortamda veya +4°C buzdolabında muhafaza ediniz.";

export const BREAD_DEFAULT_STORAGE_GUIDANCE =
  "İlk 2–3 gün oda sıcaklığında keten/bez torbada veya kese kâğıdında muhafaza ediniz (+4°C buzdolabı nişasta kristalleşmesini hızlandırır). Uzun süreli saklama için dilimleyip -18°C derin dondurucuya kaldırabilirsiniz.";

function normalizeTrText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFKC")
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLocaleLowerCase("tr-TR")
    .replace(/\u0307/g, "");
}

function asciiFold(trLowerValue: string): string {
  return trLowerValue
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");
}

function joinParts(parts: readonly (string | null | undefined)[]): string {
  return parts
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .join(" ");
}

function isProductAccompaniment(product: FoodComplianceProductInput): boolean {
  const cat = (product.category || "").trim().toLowerCase();
  if (cat.length > 0 || typeof product.capacityUnits === "number") {
    if (isAccompanimentCategory(cat)) return true;
    return isAccompaniment({
      id: product.id ?? product.productId ?? "",
      name: product.name ?? "",
      description: product.description ?? "",
      price: 0,
      imageUrl: "",
      category: cat,
      stock: 0,
      weight: 0,
      capacityUnits: product.capacityUnits ?? undefined,
    } satisfies ExtendedProduct);
  }

  if (product.flourTypes && product.flourTypes.length > 0) {
    return false;
  }

  const identityTr = normalizeTrText(
    joinParts([product.name, product.slug, product.id, product.productId])
  );
  const identityAscii = asciiFold(identityTr);

  if (
    /(?:^|[^a-zçğıöşü])(ekmek|ekmeği|somun|baget|fougasse|focaccia|simit|poğaça|çörek)/.test(
      identityTr
    ) ||
    /(?:^|[^a-z0-9])(ekmek|ekmegi|somun|baget|fougasse|focaccia|simit|pogaca|corek)/.test(
      identityAscii
    )
  ) {
    return false;
  }

  return /(?:^|[^a-z0-9])(cig[\s_-]*sut|sut|yogurt|peynir|tereyag|kaymak|lor|kefir|ayran|yumurta|sucuk|kavurma|yufka|eriste|recel|zeytin|bal|tahin)/.test(
    identityAscii
  );
}

const FERMENTED_OR_PROCESSED_DAIRY_RE =
  /(?:^|[^a-z0-9])(yogurt|peynir|kasar|tulum|ezine|tereyag|kaymak|lor|kefir|ayran|cokelek)/;

const RAW_MILK_TOKEN_RE = /(?:^|[^a-z0-9])cig[\s_-]+sut/;

/**
 * TGK Çiğ Sütün Arzına Dair Tebliğ (Tebliğ No: 2017/20) kapsamında
 * ürünün doğrudan çiğ süt ürünü olup olmadığını belirler.
 * Yoğurt, peynir, tereyağı gibi işlenmiş/mayalanmış süt ürünlerinde `false` döner.
 */
export function isRawMilkProduct(product: FoodComplianceProductInput): boolean {
  const identityTr = normalizeTrText(
    joinParts([product.name, product.slug, product.id, product.productId, product.category])
  );
  const identityAscii = asciiFold(identityTr);

  if (FERMENTED_OR_PROCESSED_DAIRY_RE.test(identityAscii)) {
    return false;
  }

  const haystackTr = normalizeTrText(
    joinParts([
      product.name,
      product.slug,
      product.id,
      product.productId,
      product.category,
      ...(product.ingredients ?? []),
    ])
  );
  const haystackAscii = asciiFold(haystackTr);

  return (
    haystackTr.includes("çiğ süt") ||
    haystackTr.includes("çiğ-süt") ||
    haystackAscii.includes("cig sut") ||
    haystackAscii.includes("cig-sut") ||
    RAW_MILK_TOKEN_RE.test(haystackAscii)
  );
}

/**
 * TGK Gıda Etiketleme ve Tüketicileri Bilgilendirme Yönetmeliği Ek-1 uyarınca
 * ürün alanlarından deterministik alerjen listesi çıkarır.
 */
export function deriveProductAllergens(product: FoodComplianceProductInput): AllergenLabel[] {
  const accompaniment = isProductAccompaniment(product);
  const fullTr = normalizeTrText(
    joinParts([
      product.name,
      product.slug,
      product.id,
      product.productId,
      product.category,
      product.description,
      ...(product.ingredients ?? []),
      ...(product.flourTypes ?? []),
    ])
  );
  const fullAscii = asciiFold(fullTr);

  const allergens: AllergenLabel[] = [];

  // 1. Gluten içeren tahıllar
  const hasGlutenKeyword =
    /(?:^|[^a-zçğıöşü])(buğday|siyez|kavılca|karakılçık|çavdar|yulaf|yufka|erişte|tarhana)/.test(
      fullTr
    ) ||
    /(?:^|[^a-z0-9])(bugday|siyez|kavilca|karakilcik|cavdar|yulaf|yufka|eriste|tarhana)/.test(
      fullAscii
    ) ||
    /(?:^|[^a-zçğıöşü])arpa(?!cık|cik)/.test(fullTr) ||
    /(?:^|[^a-zçğıöşü])un(?:$|[^a-zçğıöşü]|u|un|a|da|dan|la|lu|lar|ları|ların)(?=$|[^a-zçğıöşü])/.test(
      fullTr
    ) ||
    fullTr.includes("ekşi maya") ||
    fullAscii.includes("eksi maya") ||
    fullAscii.includes("eksi-maya");

  if (!accompaniment || hasGlutenKeyword) {
    allergens.push("Gluten içeren tahıllar");
  }

  // 2. Süt ve süt ürünleri (laktoz dahil)
  const hasDairyKeyword =
    /(?:^|[^a-zçğıöşü])(süt|yoğurt|peynir|tereyağ|kaymak|kefir|ayran)(?!süz|suz|sız|siz)/.test(
      fullTr
    ) ||
    /(?:^|[^a-z0-9])(sut|yogurt|peynir|tereyag|kaymak|kefir|ayran)(?!suz|siz)/.test(
      fullAscii
    ) ||
    /(?:^|[^a-zçğıöşü])lor(?:$|[^a-zçğıöşü]|u|un|lu|dan)(?=$|[^a-zçğıöşü])/.test(fullTr);

  if (hasDairyKeyword) {
    allergens.push("Süt ve süt ürünleri (laktoz dahil)");
  }

  // 3. Yumurta
  const hasEggKeyword =
    /(?:^|[^a-zçğıöşü])yumurta(?!sız|siz)/.test(fullTr) ||
    /(?:^|[^a-z0-9])yumurta(?!siz)/.test(fullAscii) ||
    /(?:^|[^a-zçğıöşü])erişte/.test(fullTr) ||
    /(?:^|[^a-z0-9])eriste/.test(fullAscii);

  if (hasEggKeyword) {
    allergens.push("Yumurta");
  }

  // 4. Sert kabuklu meyveler
  const hasTreeNutKeyword =
    /(?:^|[^a-zçğıöşü])(ceviz|fındık|badem)(?!sız|siz)/.test(fullTr) ||
    /(?:^|[^a-z0-9])(ceviz|findik|badem)(?!siz)/.test(fullAscii) ||
    fullTr.includes("antep fıstığı") ||
    fullTr.includes("antep fıstık") ||
    fullAscii.includes("antep fistigi") ||
    fullAscii.includes("antep fistik") ||
    fullAscii.includes("antep-fistigi") ||
    fullAscii.includes("antep-fistik");

  if (hasTreeNutKeyword) {
    allergens.push("Sert kabuklu meyveler");
  }

  // 5. Susam
  const hasSesameKeyword =
    /(?:^|[^a-zçğıöşü])(susam|tahin|simit|simidi)(?!sız|siz)/.test(fullTr) ||
    /(?:^|[^a-z0-9])(susam|tahin|simit|simidi)(?!siz)/.test(fullAscii);

  if (hasSesameKeyword) {
    allergens.push("Susam");
  }

  return allergens;
}

/**
 * Ürün grubuna ve gıda güvenliği rejimine uygun varsayılan muhafaza talimatını döner.
 */
export function getDefaultStorageGuidance(product: FoodComplianceProductInput): string {
  if (isRawMilkProduct(product)) {
    return RAW_MILK_STORAGE_GUIDANCE;
  }

  if (isProductAccompaniment(product)) {
    const identityTr = normalizeTrText(
      joinParts([
        product.name,
        product.slug,
        product.id,
        product.productId,
        product.category,
        ...(product.ingredients ?? []),
      ])
    );
    const identityAscii = asciiFold(identityTr);

    const isDryYufkaOrPasta =
      /(?:^|[^a-z0-9])(yufka|eriste|tarhana)/.test(identityAscii) &&
      !/(?:^|[^a-z0-9])(sut|yogurt|peynir|tereyag|sucuk|kavurma)/.test(
        asciiFold(normalizeTrText(joinParts([product.name, product.slug, product.category])))
      );

    if (isDryYufkaOrPasta) {
      return DRY_PANTRY_ACCOMPANIMENT_STORAGE_GUIDANCE;
    }

    const isColdChainItem = /(?:^|[^a-z0-9])(sut|yogurt|peynir|tereyag|kaymak|lor|kefir|ayran|yumurta|sucuk|kavurma|pastirma)/.test(
      identityAscii
    );

    if (isColdChainItem) {
      return COLD_CHAIN_ACCOMPANIMENT_STORAGE_GUIDANCE;
    }

    return DRY_PANTRY_ACCOMPANIMENT_STORAGE_GUIDANCE;
  }

  return BREAD_DEFAULT_STORAGE_GUIDANCE;
}

/**
 * Tek çağrıda çiğ süt kalkanı, TGK Ek-1 alerjenleri, çapraz temas notu ve muhafaza bilgisini üretir.
 */
export function getFoodComplianceSummary(
  product: FoodComplianceProductInput
): FoodComplianceSummary {
  const isRawMilk = isRawMilkProduct(product);
  const allergens = deriveProductAllergens(product);
  const defaultStorage = getDefaultStorageGuidance(product);

  return {
    isRawMilk,
    rawMilkHeadline: isRawMilk ? RAW_MILK_HEADLINE : null,
    rawMilkDetail: isRawMilk ? RAW_MILK_DETAIL : null,
    allergens,
    crossContactNote: CROSS_CONTACT_NOTE,
    defaultStorage,
  };
}
