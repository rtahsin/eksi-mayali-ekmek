import { z } from "zod";
import type { BakeLog, BakeLogItem } from "@/types/bake";

// "Fırından çıktı" kayıtlarının saf mantığı: form doğrulama, fotoğraf yolu, satır eşleme.
// Fotoğraflar 'media' bucket'ında firin/<gün>/<uuid>.<uzantı> altında durur (027 kısıtıyla aynı biçim).

export const MEDIA_BUCKET = "media";
/** Telefonda küçültülmüş fotoğraf bunu aşmaz; aşarsa küçültme çalışmamıştır. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
/** Uzun kenar, piksel */
export const PHOTO_MAX_EDGE = 1600;

export const PHOTO_TYPES = { "image/webp": "webp", "image/jpeg": "jpg" } as const;
export type PhotoType = keyof typeof PHOTO_TYPES;

export function isPhotoType(type: string): type is PhotoType {
  return Object.prototype.hasOwnProperty.call(PHOTO_TYPES, type);
}

export const BakeItemSchema = z.object({
  productId: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  quantity: z.number().int().min(1, "Adet en az 1").max(500, "Adet en fazla 500"),
});

export const BakeLogInputSchema = z.object({
  items: z.array(BakeItemSchema).max(20),
  note: z
    .string()
    .trim()
    .max(140, "Not en fazla 140 karakter")
    .transform((s) => (s === "" ? null : s))
    .nullable()
    .default(null),
});

export type BakeLogInput = z.infer<typeof BakeLogInputSchema>;

/** Aynı ürün iki kez girildiyse adetleri birleştirir; 0 adetli satırları atar. */
export function mergeItems(items: readonly BakeLogItem[]): BakeLogItem[] {
  const merged = new Map<string, BakeLogItem>();
  for (const it of items) {
    if (it.quantity <= 0) continue;
    const prev = merged.get(it.productId);
    merged.set(it.productId, prev ? { ...prev, quantity: prev.quantity + it.quantity } : { ...it });
  }
  return [...merged.values()];
}

export function photoPath(day: string, id: string, type: PhotoType): string {
  return `firin/${day}/${id}.${PHOTO_TYPES[type]}`;
}

/** Uzun kenarı `max`'ı aşmayacak şekilde orantılı boyut; küçük görsel büyütülmez. */
export function fitWithin(width: number, height: number, max: number = PHOTO_MAX_EDGE): { width: number; height: number } {
  const edge = Math.max(width, height);
  if (edge <= max) return { width, height };
  const k = max / edge;
  return { width: Math.round(width * k), height: Math.round(height * k) };
}

export interface BakeLogRow {
  id: string;
  baked_at: string;
  day: string;
  items: unknown;
  photo_path: string | null;
  note: string | null;
  hidden: boolean;
}

/** Veritabanı satırı → BakeLog. Bozuk ürün satırları sessizce atlanır (kayıt yine görünür). */
export function rowToBakeLog(row: BakeLogRow, publicUrl: (path: string) => string): BakeLog {
  const items = Array.isArray(row.items)
    ? row.items.flatMap((it) => {
        const parsed = BakeItemSchema.safeParse(it);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
  return {
    id: row.id,
    bakedAt: row.baked_at,
    day: row.day,
    items,
    photoUrl: row.photo_path ? publicUrl(row.photo_path) : null,
    note: row.note,
    hidden: row.hidden,
  };
}

const clock = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Kaydın İstanbul saati, "HH:MM". */
export function bakeClock(iso: string): string {
  return clock.format(new Date(iso));
}

export function totalLoaves(log: Pick<BakeLog, "items">): number {
  return log.items.reduce((s, it) => s + it.quantity, 0);
}
