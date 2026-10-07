import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

type ModuleName =
  | "kernel"
  | "knowledge"
  | "content"
  | "content_editorial"
  | "editorial"
  | "learning"
  | "catalog"
  | "ordering"
  | "ledger"
  | "delivery"
  | "identity"
  | "engagement"
  | "settings"
  | "notify"
  | "supabase"
  | "store"
  | "utils"
  | "print"
  | "site_shared";

interface ModuleEdge {
  fromMod: ModuleName;
  toMod: ModuleName | "external_firebase";
  fromFile: string;
  importTarget: string;
}

const ALLOWED_EDGES: Record<ModuleName, readonly ModuleName[]> = {
  kernel: [],
  knowledge: ["kernel", "content"],
  content: ["knowledge", "editorial"],
  content_editorial: ["knowledge", "editorial"],
  editorial: ["knowledge", "kernel", "content_editorial", "utils"],
  learning: ["knowledge", "kernel", "utils"],
  catalog: ["kernel", "supabase", "utils", "ordering"],
  ordering: ["catalog", "settings", "kernel", "supabase", "store", "identity", "utils"],
  ledger: ["kernel", "supabase", "identity", "utils"],
  delivery: ["ordering", "kernel", "supabase", "utils"],
  identity: ["kernel", "supabase", "utils"],
  engagement: ["kernel", "supabase", "utils"],
  settings: ["kernel", "supabase", "utils"],
  notify: ["kernel", "site_shared", "utils"],
  print: ["site_shared", "kernel", "utils"],
  store: ["kernel", "utils"],
  utils: ["supabase", "kernel", "site_shared"],
  supabase: ["kernel"],
  site_shared: ["kernel"],
};

function resolveModule(filePath: string): ModuleName | null {
  const norm = filePath.replace(/\\/g, "/");

  if (norm.startsWith("content/")) {
    if (
      norm.startsWith("content/sources") ||
      norm.startsWith("content/claims") ||
      norm.startsWith("content/concepts")
    ) {
      return "content";
    }
    return "content_editorial";
  }

  if (norm.startsWith("src/lib/kernel") || norm.startsWith("src/lib/time")) {
    return "kernel";
  }
  if (norm.startsWith("src/lib/knowledge")) return "knowledge";
  if (norm.startsWith("src/lib/editorial") || norm.startsWith("src/components/editorial")) return "editorial";
  if (norm.startsWith("src/lib/game") || norm.startsWith("src/components/game")) return "learning";
  if (norm.startsWith("src/lib/products")) return "catalog";
  if (
    norm.startsWith("src/lib/ordering") ||
    norm.startsWith("src/lib/order") ||
    norm.startsWith("src/lib/orders")
  ) {
    return "ordering";
  }
  if (norm.startsWith("src/lib/cari")) return "ledger";
  if (norm.startsWith("src/lib/delivery") || norm.startsWith("src/lib/courier")) return "delivery";
  if (norm.startsWith("src/lib/security")) return "identity";
  if (norm.startsWith("src/lib/engagement") || norm.endsWith("src/lib/track.ts")) return "engagement";
  if (norm.startsWith("src/lib/settings")) return "settings";
  if (norm.startsWith("src/lib/notify")) return "notify";
  if (norm.startsWith("src/lib/supabase")) return "supabase";
  if (norm.startsWith("src/lib/store")) return "store";
  if (norm.startsWith("src/lib/utils")) return "utils";
  if (norm.startsWith("src/lib/print")) return "print";
  if (
    norm.startsWith("src/lib/design") ||
    norm.startsWith("src/lib/theme") ||
    norm.endsWith("src/lib/site.ts") ||
    norm.endsWith("src/lib/features.ts") ||
    norm.endsWith("src/lib/legal.ts")
  ) {
    return "site_shared";
  }

  return null;
}

function getAllFiles(dir: string, baseDir: string = process.cwd()): string[] {
  const absDir = path.resolve(baseDir, dir);
  if (!fs.existsSync(absDir)) return [];

  let results: string[] = [];
  for (const item of fs.readdirSync(absDir, { withFileTypes: true })) {
    const full = path.join(absDir, item.name);
    const rel = path.relative(baseDir, full).replace(/\\/g, "/");

    if (item.isDirectory()) {
      if (
        item.name !== "node_modules" &&
        item.name !== ".next" &&
        item.name !== "__fixtures__"
      ) {
        results.push(...getAllFiles(rel, baseDir));
      }
    } else if (
      (item.name.endsWith(".ts") || item.name.endsWith(".tsx")) &&
      !item.name.endsWith(".test.ts") &&
      !item.name.endsWith(".test.tsx")
    ) {
      results.push(rel);
    }
  }
  return results;
}

function extractImports(filePath: string, content: string): ModuleEdge[] {
  const fromMod = resolveModule(filePath);
  if (!fromMod) return [];

  const importRegex = /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
  const edges: ModuleEdge[] = [];

  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    const target = match[1];

    // R4 kontrolü: Firebase içe aktarımı
    if (
      target.startsWith("@/lib/firebase") ||
      target.startsWith("firebase/") ||
      target === "firebase" ||
      target.startsWith("firebase-admin/") ||
      target === "firebase-admin"
    ) {
      edges.push({
        fromMod,
        toMod: "external_firebase",
        fromFile: filePath,
        importTarget: target,
      });
      continue;
    }

    let targetPath = "";
    if (target.startsWith("@/")) {
      targetPath = "src/" + target.slice(2);
    } else if (target.startsWith("@content/")) {
      targetPath = "content/" + target.slice(9);
    } else if (target.startsWith(".")) {
      const absResolved = path.resolve(path.dirname(filePath), target);
      targetPath = path.relative(process.cwd(), absResolved).replace(/\\/g, "/");
    } else {
      // Harici kütüphane (örn. react, zod vs.)
      continue;
    }

    const toMod = resolveModule(targetPath);
    if (toMod && toMod !== fromMod) {
      edges.push({
        fromMod,
        toMod,
        fromFile: filePath,
        importTarget: target,
      });
    }
  }

  return edges;
}

describe("Mimari Sınır Testleri (R1 - R5)", () => {
  const KNOWN_VIOLATIONS: readonly string[] = [];

  it("R1, R2, R4: Modül sınırları, bağımlılık yönleri ve Firebase yasağı doğrulanır", () => {
    const filesToScan = [
      ...getAllFiles("src/lib"),
      ...getAllFiles("content"),
    ];

    const violations: string[] = [];

    for (const file of filesToScan) {
      const content = fs.readFileSync(file, "utf8");
      const edges = extractImports(file, content);

      for (const edge of edges) {
        if (edge.toMod === "external_firebase") {
          violations.push(
            `R4 İhlali: ${edge.fromFile} Firebase modülünü içe aktarıyor (${edge.importTarget})`
          );
          continue;
        }

        const allowed = ALLOWED_EDGES[edge.fromMod] || [];
        if (!allowed.includes(edge.toMod)) {
          const violationKey = `${edge.fromMod} -> ${edge.toMod} (${edge.fromFile})`;
          if (!KNOWN_VIOLATIONS.includes(violationKey)) {
            violations.push(
              `R2 İhlali: İzin verilmeyen modül kenarı: ${edge.fromMod} -> ${edge.toMod} [Dosya: ${edge.fromFile}, Hedef: ${edge.importTarget}]`
            );
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("Fixture testi: arch-ihlal örnek dosyası beklenen tüm ihlalleri üretir", () => {
    const fixturePath = "src/lib/kernel/__fixtures__/arch-ihlal/invalid-edge.ts";
    const content = fs.readFileSync(fixturePath, "utf8");

    // Fixture dosyasını editorial modülünde farz ederek doğrula
    const fakeFilePath = "src/lib/editorial/fake-editorial.ts";
    const edges = extractImports(fakeFilePath, content);

    const fixtureViolations: string[] = [];
    for (const edge of edges) {
      if (edge.toMod === "external_firebase") {
        fixtureViolations.push("R4_FIREBASE");
      } else {
        const allowed = ALLOWED_EDGES[edge.fromMod] || [];
        if (!allowed.includes(edge.toMod)) {
          fixtureViolations.push(`DISALLOWED_EDGE_${edge.fromMod}_TO_${edge.toMod}`);
        }
      }
    }

    // Fixture içindeki 3 ihlalin (Firebase, catalog, ordering) yakalandığını doğrula
    expect(fixtureViolations).toContain("R4_FIREBASE");
    expect(fixtureViolations).toContain("DISALLOWED_EDGE_editorial_TO_catalog");
    expect(fixtureViolations).toContain("DISALLOWED_EDGE_editorial_TO_ordering");
  });

  it("R5 Cırcır Testi: <any, any, any> ve SupabaseClient<any sayısı başlangıç değerini aşamaz", () => {
    const allSrcFiles = getAllFiles("src");
    let untypedSupabaseMatches = 0;
    const matchRegex = /<any,\s*any,\s*any>|SupabaseClient<any/g;

    const matchedLocations: string[] = [];
    for (const file of allSrcFiles) {
      const content = fs.readFileSync(file, "utf8");
      const matches = content.match(matchRegex);
      if (matches) {
        untypedSupabaseMatches += matches.length;
        matchedLocations.push(`${file} (${matches.length})`);
      }
    }

    // Başlangıç dondurulmuş sayısı: 2 (src/lib/supabase/admin.ts içinde legacy createAdminClient)
    const MAX_ALLOWED_UNTYPED_SUPABASE = 2;
    expect(
      untypedSupabaseMatches,
      `Untyped Supabase sayısı sınırı aştı! Bulunan: ${untypedSupabaseMatches}, Konumlar: ${matchedLocations.join(", ")}`
    ).toBeLessThanOrEqual(MAX_ALLOWED_UNTYPED_SUPABASE);
  });
});
