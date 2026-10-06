import fs from "fs";
import path from "path";

/**
 * 013 ve sonrası beklenen numaralı migration'lar listesi (P1-11).
 * Canlı veritabanındaki `app_migrations` tablosuyla senkron kontrolü için tek kaynaktır.
 */
export const EXPECTED_MIGRATIONS: readonly string[] = [
  "013_security_hardening",
  "014_order_core",
  "015_flexible_products",
  "016_ledger",
  "017_ledger_hardening",
  "018_order_lifecycle",
  "021_funnel_events",
  "022_media_bucket",
  "023_record_order_payment",
  "024_single_writer",
  "025_funnel_events_v2",
] as const;

export interface MigrationDiffResult {
  expected: string[];
  applied: string[];
  missing: string[];
  allApplied: boolean;
}

/**
 * Veritabanından gelen uygulanmış migration ID'leri ile beklenen listeyi karşılaştırır.
 */
export function checkMigrationDiff(appliedIds: string[]): MigrationDiffResult {
  const appliedSet = new Set(appliedIds);
  const expectedList = [...EXPECTED_MIGRATIONS];
  const missing = expectedList.filter((m) => !appliedSet.has(m));

  return {
    expected: expectedList,
    applied: appliedIds.filter((id) => expectedList.includes(id)),
    missing,
    allApplied: missing.length === 0,
  };
}

/**
 * Disk üzerindeki `supabase/migrations` dizininden ≥013 migration listesini dinamik okur (DoD doğrulaması için).
 */
export function scanExpectedMigrations(dirPath?: string): string[] {
  const targetDir = dirPath || path.resolve(process.cwd(), "supabase/migrations");
  if (!fs.existsSync(targetDir)) return [];

  return fs
    .readdirSync(targetDir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => f.replace(/\.sql$/, ""))
    .filter((name) => {
      const match = name.match(/^(\d{3})/);
      return match ? parseInt(match[1], 10) >= 13 : false;
    })
    .sort();
}
