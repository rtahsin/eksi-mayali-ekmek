import type { StudyoFormatKey, StudyoPublishChannel } from "@/types/studyo";

export const STUDYO_BUCKET = "studyo";

/** 9:16 dikey video kanvas boyutu */
export const CANVAS_9X16_WIDTH = 1080;
export const CANVAS_9X16_HEIGHT = 1920;

/** Reels / TikTok / Shorts güvenli alan alt ve sağ marj alt sınırları (px) */
export const SAFE_ZONE_BOTTOM_MIN_PX = 422;
export const SAFE_ZONE_RIGHT_MIN_PX = 152;

/** Önerilen varsayılan güvenli alan marjları (px) */
export const DEFAULT_SAFE_ZONE_BOTTOM_PX = 436;
export const DEFAULT_SAFE_ZONE_RIGHT_PX = 156;

/** Ses ve video boyut sınırları (doğrudan Supabase imzalı yükleme) */
export const MAX_STUDYO_AUDIO_BYTES = 40 * 1024 * 1024; // 40 MB (48kHz WAV ~5.5 MB/dk)
export const MAX_STUDYO_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB (S24 4K/60fps kısa klip)
export const MAX_STUDYO_DOC_BYTES = 25 * 1024 * 1024; // 25 MB (A5 Gazete PDF)

export const STUDYO_ALLOWED_BUCKET_MIMES = [
  "application/json",
  "text/markdown",
  "text/plain",
  "application/pdf",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "audio/mpeg",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "image/webp",
  "image/png",
  "image/jpeg",
] as const;

export const AUDIO_MIME_TO_EXT: Readonly<Record<string, string>> = {
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
};

export const VIDEO_MIME_TO_EXT: Readonly<Record<string, string>> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export const OUTPUT_MIME_TO_EXT: Readonly<Record<string, string>> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "application/pdf": "pdf",
};

export const FORMAT_LABELS: Readonly<
  Record<StudyoFormatKey, { short: string; title: string; badge: string }>
> = {
  kisa_01: {
    short: "Reels #01",
    title: "Seri A — Bilimsel Kısa #01 (9:16)",
    badge: "Seri A · Bilim",
  },
  kisa_02: {
    short: "Reels #02",
    title: "Seri A — Bilimsel Kısa #02 (9:16)",
    badge: "Seri A · Bilim",
  },
  seri_b: {
    short: "Taş Fırın (Seri B)",
    title: "Seri B — Taş Fırın Günlüğü (9:16)",
    badge: "Seri B · Gerçek Fırın",
  },
  uzun: {
    short: "Uzun Bölüm / Kitap",
    title: "YouTube 16:9 & Kitap Özeti (İsteğe Bağlı)",
    badge: "Arşiv · Uzun",
  },
};

export const PUBLISH_CHANNEL_META: ReadonlyArray<{
  id: StudyoPublishChannel;
  label: string;
  handle: string;
}> = [
  { id: "ig_reels_1", label: "IG Reels #01", handle: "@ekmeklabtr" },
  { id: "ig_reels_2", label: "IG Reels #02", handle: "@ekmeklabtr" },
  { id: "ig_seri_b", label: "IG Taş Fırın (Seri B)", handle: "@ekmeklabtr" },
  { id: "tiktok", label: "TikTok 9:16", handle: "@ekmek.lab" },
  { id: "youtube_shorts", label: "YouTube Shorts", handle: "@ekmeklab" },
  { id: "gazete_baski", label: "A5 Kese Kâğıdı Gazete", handle: "Baskı · 300 DPI" },
  { id: "web_bilim", label: "ekmeklab.tr /bilim", handle: "QR Köprüsü" },
];

const KONU_ID_RE = /^KONU-(?:0[1-9]|1[0-9]|2[0-5])$/;

export function isValidKonuId(value: string): boolean {
  return KONU_ID_RE.test(value);
}
