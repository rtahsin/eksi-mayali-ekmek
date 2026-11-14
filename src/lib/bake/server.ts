import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/kernel/log";
import { istanbulToday } from "@/lib/time/istanbul";
import { MEDIA_BUCKET, rowToBakeLog, type BakeLogRow } from "@/lib/bake/log";

export interface LatestProductBake {
  id: string;
  /** ISO zaman damgası (snake_case uyumluluk alanı) */
  baked_at: string;
  /** ISO zaman damgası */
  bakedAt: string;
  /** İstanbul günü, YYYY-MM-DD */
  day: string;
  /** Bu partide fırından çıkan somun adedi */
  count: number;
  /** Fırıncı notu (yoksa null) */
  notes: string | null;
  /** Herkese açık fırın çıkış fotoğrafları */
  photos: string[];
}

/**
 * Bugünün son (gizli olmayan) fırın çıkışının saati, ISO. Kayıt yoksa, tablo henüz yoksa
 * (027 uygulanmadıysa) ya da okunamazsa null: rozet saate göre durumla devam eder.
 */
export async function getSonCikis(now: Date = new Date()): Promise<string | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("bake_logs")
      .select("baked_at")
      .eq("day", istanbulToday(now))
      .eq("hidden", false)
      .order("baked_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as { baked_at: string } | null)?.baked_at ?? null;
  } catch (err: unknown) {
    logError("getSonCikis failed", err);
    return null;
  }
}

/**
 * Verilen ürün için `bake_logs` tablosundaki en son görünür fırın çıkışını okur.
 * Supabase ortam değişkeni yoksa, tablo henüz oluşmadıysa veya kayıt yoksa `null` döner;
 * ürün detay sayfasını hiçbir koşulda kırmaz.
 */
export async function getLatestProductBake(
  productId: string
): Promise<LatestProductBake | null> {
  const trimmedId = productId.trim();
  if (!trimmedId) return null;

  const supabase = createAdminClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("bake_logs")
      .select("id, baked_at, day, items, photo_path, note, hidden")
      .eq("hidden", false)
      .order("baked_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    const publicUrl = (path: string) =>
      supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;

    for (const rawRow of data as BakeLogRow[]) {
      const parsedLog = rowToBakeLog(rawRow, publicUrl);
      const matchingItem = parsedLog.items.find(
        (item) => item.productId === trimmedId
      );
      if (matchingItem) {
        return {
          id: parsedLog.id,
          baked_at: parsedLog.bakedAt,
          bakedAt: parsedLog.bakedAt,
          day: parsedLog.day,
          count: matchingItem.quantity,
          notes: parsedLog.note,
          photos: parsedLog.photoUrl ? [parsedLog.photoUrl] : [],
        };
      }
    }

    return null;
  } catch (err: unknown) {
    logError("getLatestProductBake failed", err, { productId: trimmedId });
    return null;
  }
}
