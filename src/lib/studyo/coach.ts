import type {
  StudyoCoachCheck,
  StudyoCoachReport,
  StudyoFormatKey,
  StudyoScene,
} from "@/types/studyo";
import {
  DEFAULT_SAFE_ZONE_BOTTOM_PX,
  DEFAULT_SAFE_ZONE_RIGHT_PX,
  SAFE_ZONE_BOTTOM_MIN_PX,
  SAFE_ZONE_RIGHT_MIN_PX,
} from "./constants";
import { checkK006Compliance } from "./k006";

const NUMERIC_ANCHOR_RE =
  /\d+(?:[.,]\d+)?\s*(?:°C|derece|%|yüzde|saat|dakika|gün|sn|saniye|gram|kg|mm|mM|ppm|pH|pehaş)|(?<![\p{L}\p{N}])pH\s*\d+(?:[.,]\d+)?|(?<![\p{L}\p{N}])yüzde\s+[\p{L}]+/giu;

const HOOK_SIGNAL_RE =
  /[?!]|(?<![\p{L}\p{N}])(?:sakın|neden|nasıl|dikkat|hiç|yanlış|gerçek)(?![\p{L}\p{N}])/iu;

const CTA_SIGNAL_RE =
  /(?<![\p{L}\p{N}])(?:ekmeklab|taş fırın|kalıpta|bıçak vurma|kavanoz|dinlenmeye|bilim|takipte|yorum|sofra)/iu;

export function verifySafeZoneMargins(
  bottomPx: number = DEFAULT_SAFE_ZONE_BOTTOM_PX,
  rightPx: number = DEFAULT_SAFE_ZONE_RIGHT_PX
): { passed: boolean; detail: string } {
  const passed =
    bottomPx >= SAFE_ZONE_BOTTOM_MIN_PX && rightPx >= SAFE_ZONE_RIGHT_MIN_PX;
  return {
    passed,
    detail: passed
      ? `Alt ${bottomPx}px (>=${SAFE_ZONE_BOTTOM_MIN_PX}px) · Sağ ${rightPx}px (>=${SAFE_ZONE_RIGHT_MIN_PX}px)`
      : `Güvenli alan ihlali: Alt ${bottomPx}px / Sağ ${rightPx}px`,
  };
}

/**
 * 0–100 Yönetmen Koçu (Yumuşak Kalite Kapısı + K006 Sert Eşik Özeti).
 * Tahsin'e metni kaydetmeden veya okumadan önce somut tempo, kanca ve bilimsel çapa geri bildirimi verir.
 */
export function evaluateDirectorCoach(
  scenes: readonly StudyoScene[],
  format: StudyoFormatKey,
  safeZoneBottomPx: number = DEFAULT_SAFE_ZONE_BOTTOM_PX,
  safeZoneRightPx: number = DEFAULT_SAFE_ZONE_RIGHT_PX
): StudyoCoachReport {
  const fullVoice = scenes.map((s) => s.voiceText).join(" ");
  const fullCaptions = scenes.map((s) => s.caption).join(" ");
  const combined = `${fullVoice}\n${fullCaptions}`;

  const words = fullVoice
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const wordCount = words.length;
  const estimatedTotalSec =
    Math.round(
      scenes.reduce((sum, s) => sum + (s.estimatedSec || 0), 0) * 10
    ) / 10;

  const anchorMatches = combined.match(NUMERIC_ANCHOR_RE) ?? [];
  const numericAnchorCount = anchorMatches.length;

  const k006 = checkK006Compliance(combined);
  const safeZone = verifySafeZoneMargins(safeZoneBottomPx, safeZoneRightPx);

  const checks: StudyoCoachCheck[] = [];

  // 1) K006 Sıfır Sağlık Beyanı (25 puan)
  checks.push({
    id: "k006_clean",
    label: "K006 Sıfır Sağlık Beyanı",
    passed: k006.passed,
    score: k006.passed ? 25 : 0,
    maxScore: 25,
    detail: k006.passed
      ? "Metin %100 fizikokimyasal dilde; tıbbi/sağlık vaadi yok."
      : `${k006.violationCount} sağlık terimi tespit edildi (${k006.violations
          .map((v) => v.term)
          .slice(0, 3)
          .join(", ")}).`,
  });

  // 2) İlk 3 Saniye Kancası (20 puan)
  const firstScene = scenes[0]?.voiceText ?? "";
  const firstWords = firstScene.trim().split(/\s+/).filter(Boolean).length;
  const hookStrong =
    firstScene.length >= 20 &&
    firstWords <= 28 &&
    HOOK_SIGNAL_RE.test(firstScene);
  checks.push({
    id: "hook_3s",
    label: "İlk 3 Saniye Kancası",
    passed: hookStrong,
    score: hookStrong ? 20 : firstScene.length >= 15 ? 12 : 4,
    maxScore: 20,
    detail: hookStrong
      ? `Sahne 1 (${firstWords} kelime) doğrudan merak/çatışma ile açılıyor.`
      : "Sahne 1'i soru veya somut fırıncı hatasıyla (<=28 kelime) açın.",
  });

  // 3) Ölçülebilir Fizikokimyasal Çapa Yoğunluğu (20 puan)
  const targetAnchors = format === "seri_b" ? 1 : 2;
  const anchorPassed = numericAnchorCount >= targetAnchors;
  checks.push({
    id: "numeric_anchors",
    label: "Ölçülebilir Bilim Çapası (pH / °C / % / dk)",
    passed: anchorPassed,
    score: anchorPassed ? 20 : numericAnchorCount === 1 ? 12 : 5,
    maxScore: 20,
    detail: anchorPassed
      ? `${numericAnchorCount} adet sayısal ölçüm çapası mevcut.`
      : `En az ${targetAnchors} somut ölçüm (ör. pH 4,5 · 55 °C · 24 saat) ekleyin.`,
  });

  // 4) 9:16 Hedef Tempo ve Süre Penceresi (20 puan)
  const isLong = format === "uzun";
  const minSec = isLong ? 180 : 22;
  const maxSec = isLong ? 720 : 62;
  const durationOptimal =
    estimatedTotalSec >= minSec && estimatedTotalSec <= maxSec;
  const longestScene = scenes.reduce(
    (mx, s) => Math.max(mx, s.estimatedSec || 0),
    0
  );
  const scenePacingGood = isLong ? longestScene <= 85 : longestScene <= 15;
  const pacingScore =
    durationOptimal && scenePacingGood
      ? 20
      : durationOptimal || scenePacingGood
      ? 13
      : 6;
  checks.push({
    id: "pacing_9x16",
    label: isLong ? "Uzun Bölüm Akışı" : "9:16 Reels Tempo Penceresi (22–62 sn)",
    passed: durationOptimal && scenePacingGood,
    score: pacingScore,
    maxScore: 20,
    detail: `Toplam ~${estimatedTotalSec} sn (${scenes.length} sahne, en uzun sahne ${longestScene} sn).`,
  });

  // 5) Kapanış Eylemi & 9:16 Safe-Zone Koruması (15 puan)
  const lastScene = scenes[scenes.length - 1]?.voiceText ?? "";
  const ctaOk = CTA_SIGNAL_RE.test(lastScene) && lastScene.length >= 16;
  const closingPassed = ctaOk && safeZone.passed;
  checks.push({
    id: "cta_and_safezone",
    label: "Tezgâh Kuralı Kapanışı & 9:16 Safe-Zone",
    passed: closingPassed,
    score: closingPassed ? 15 : safeZone.passed ? 10 : 0,
    maxScore: 15,
    detail: safeZone.passed
      ? ctaOk
        ? `Uygulanabilir fırıncı kuralı ile kapanıyor · ${safeZone.detail}`
        : `Son sahneye net bir tezgâh/sofra kuralı ekleyin · ${safeZone.detail}`
      : safeZone.detail,
  });

  const totalScore = checks.reduce((sum, item) => sum + item.score, 0);

  return {
    totalScore,
    estimatedTotalSec,
    wordCount,
    numericAnchorCount,
    safeZonePassed: safeZone.passed,
    checks,
  };
}
