import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoreSettings } from "@/types/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_STORE_SETTINGS, parseStoredSettings } from "./schema";

/**
 * İşletme ayarlarını service-role ile okur. Veritabanına ulaşılamazsa varsayılanlar döner
 * (vitrin açık kalır; sipariş API'si ayrıca DB bağlantısını kendisi doğrular).
 */
export async function getStoreSettings(client?: SupabaseClient | null): Promise<StoreSettings> {
  const supabase = client ?? createAdminClient();
  if (!supabase) return DEFAULT_STORE_SETTINGS;

  const { data, error } = await supabase
    .from("bakery_settings")
    .select("key, value")
    .in("key", ["operational_settings", "order_cutoff_time"]);

  if (error) {
    console.error("getStoreSettings error:", error.message);
    return DEFAULT_STORE_SETTINGS;
  }

  const rows = new Map<string, unknown>((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  return parseStoredSettings(rows.get("operational_settings"), rows.get("order_cutoff_time"));
}
