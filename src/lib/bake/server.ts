import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/kernel/log";
import { istanbulToday } from "@/lib/time/istanbul";

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
