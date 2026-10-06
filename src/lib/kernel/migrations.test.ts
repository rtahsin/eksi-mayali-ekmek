import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import {
  EXPECTED_MIGRATIONS,
  checkMigrationDiff,
} from "./migrations";

/**
 * Disk üzerindeki `supabase/migrations` dizininden ≥013 migration listesini dinamik okur (DoD doğrulaması için).
 */
function scanExpectedMigrations(dirPath?: string): string[] {
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

describe("Database Migrations Integrity & Verification (P1-11)", () => {
  it("matches EXPECTED_MIGRATIONS exactly with files >=013 in supabase/migrations directory", () => {
    const onDiskMigrations = scanExpectedMigrations();

    // EXPECTED_MIGRATIONS listesi ile diskteki >=013 dosyalar birebir eşleşmeli
    expect([...EXPECTED_MIGRATIONS]).toEqual(onDiskMigrations);
    expect(EXPECTED_MIGRATIONS.length).toBeGreaterThanOrEqual(10);
  });

  it("detects missing migrations correctly via checkMigrationDiff", () => {
    // Yalnızca ilk 5 migration uygulanmış gibi simüle et
    const partialApplied = EXPECTED_MIGRATIONS.slice(0, 5);
    const result = checkMigrationDiff([...partialApplied]);

    expect(result.allApplied).toBe(false);
    expect(result.applied).toEqual(partialApplied);
    expect(result.missing.length).toBe(EXPECTED_MIGRATIONS.length - 5);
    expect(result.missing).toEqual(EXPECTED_MIGRATIONS.slice(5));
  });

  it("returns allApplied true when all migrations are present", () => {
    const allApplied = [...EXPECTED_MIGRATIONS, "older_legacy_001"];
    const result = checkMigrationDiff(allApplied);

    expect(result.allApplied).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.applied.length).toBe(EXPECTED_MIGRATIONS.length);
  });
});
