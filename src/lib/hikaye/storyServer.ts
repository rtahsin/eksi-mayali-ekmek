import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/kernel/log";
import { getAn, getAnKimlikleri } from "@/lib/bilim/server";
import { MEDIA_BUCKET } from "@/lib/bake/log";
import { parseStory, type StoryStep } from "./story";

export interface AnSecenegi {
  id: string;
  no: number;
  baslik: string;
}

/** Bilim odasındaki anlar, yolculuk sırasıyla (adım editöründe seçmek için). */
export function anSecenekleri(): AnSecenegi[] {
  return getAnKimlikleri().map((id, i) => ({ id, no: i + 1, baslik: getAn(id).baslik }));
}

/** Herkese açık dosya adreslerinin öneki; adımda yalnız yol saklanır. */
export function mediaBaseUrl(): string | null {
  const supabase = createAdminClient();
  if (!supabase) return null;
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl("").data.publicUrl;
}

/** Ürünün adımları; yoksa, tablo henüz yoksa ya da okunamazsa boş liste (sayfa bozulmaz). */
export async function getProductStory(productId: string): Promise<StoryStep[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from("product_stories").select("steps").eq("product_id", productId).maybeSingle();
    if (error) throw error;
    return parseStory((data as { steps: unknown } | null)?.steps);
  } catch (err: unknown) {
    logError("getProductStory failed", err, { productId });
    return [];
  }
}
