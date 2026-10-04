import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoreSettings } from "@/types/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_STORE_SETTINGS, parseStoredSettings } from "./schema";

export class SettingsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsUnavailableError";
  }
}

/**
 * İşletme ayarlarını service-role ile okur.
 *
 * - `failClosed: false` (vitrin, tarih listesi): veritabanına ulaşılamazsa varsayılanlar döner,
 *   site açık kalır.
 * - `failClosed: true` (sipariş oluşturma, admin ayarları): okunamazsa HATA fırlatır. Aksi halde
 *   kapalı dükkan açılabilir, yanlış ücret alınabilir ya da admin varsayılanları görüp gerçek
 *   ayarların üzerine yazabilir.
 */
export async function getStoreSettings(
  client?: SupabaseClient | null,
  options: { failClosed?: boolean } = {}
): Promise<StoreSettings> {
  const supabase = client ?? createAdminClient();
  if (!supabase) {
    if (options.failClosed) throw new SettingsUnavailableError("Supabase istemcisi yok");
    return DEFAULT_STORE_SETTINGS;
  }

  const { data, error } = await supabase
    .from("bakery_settings")
    .select("key, value")
    .in("key", ["operational_settings", "order_cutoff_time"]);

  if (error) {
    console.error("getStoreSettings error:", error.message);
    if (options.failClosed) throw new SettingsUnavailableError(error.message);
    return DEFAULT_STORE_SETTINGS;
  }

  const rows = new Map<string, unknown>((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  return parseStoredSettings(rows.get("operational_settings"), rows.get("order_cutoff_time"));
}
