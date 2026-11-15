import { findHealthTerms } from "@/lib/knowledge/lint";
import type { StudyoK006Report, StudyoK006Violation } from "@/types/studyo";

/** Türkçe büyük/küçük harf duyarlı küçültme (`İ` -> `i`, `I` -> `ı`). */
export function trLower(input: string): string {
  return input.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
}

interface K006Rule {
  id: string;
  pattern: RegExp;
  replacement: string;
  label: string;
}

const K006_RULES: readonly K006Rule[] = [
  {
    id: "sindirimi_kolay",
    pattern: /sindirimi\s+kolay\p{L}*/giu,
    replacement: "uzun fermantasyonla yumuşamış iç doku",
    label: "sindirimi kolay",
  },
  {
    id: "bagirsak_dostu",
    pattern: /bağırsak\s+dostu/giu,
    replacement: "fermantasyon dengeli",
    label: "bağırsak dostu",
  },
  {
    id: "bagirsak_sagligi",
    pattern: /bağırsak\s+sağlığ\p{L}*/giu,
    replacement: "mikrobiyal fermantasyon dengesi",
    label: "bağırsak sağlığı",
  },
  {
    id: "probiyotik_etki",
    pattern: /probiyotik(?:\s+etki\p{L}*)?/giu,
    replacement: "canlı laktik fermantasyon kültürü",
    label: "probiyotik",
  },
  {
    id: "glisemik_indeks",
    pattern: /glisemik\s+indeks\p{L}*/giu,
    replacement: "nişasta jelatinleşme profili",
    label: "glisemik indeks",
  },
  {
    id: "kan_sekeri",
    pattern: /kan\s+şekeri\p{L}*/giu,
    replacement: "serbest maltoz salımı",
    label: "kan şekeri",
  },
  {
    id: "insulin",
    pattern: /(?<![\p{L}\p{N}])insülin\p{L}*/giu,
    replacement: "enzimatik hidroliz hızı",
    label: "insülin",
  },
  {
    id: "sifa",
    pattern: /(?<![\p{L}\p{N}])şifa\p{L}*/giu,
    replacement: "doku dengesi",
    label: "şifa",
  },
  {
    id: "saglikli",
    pattern: /(?<![\p{L}\p{N}])sağlıklı\p{L}*/giu,
    replacement: "dengeli olgunlaşmış",
    label: "sağlıklı",
  },
  {
    id: "tedavi",
    pattern: /(?<![\p{L}\p{N}])tedavi(?:\s+ed\p{L}*)?/giu,
    replacement: "yapıyı dengeler",
    label: "tedavi",
  },
  {
    id: "iyilestir",
    pattern: /(?<![\p{L}\p{N}])iyileştir\p{L}*/giu,
    replacement: "dokuyu geliştirir",
    label: "iyileştirir",
  },
  {
    id: "bagisiklik",
    pattern: /(?<![\p{L}\p{N}])bağışıklığ?\p{L}*/giu,
    replacement: "asit tamponlama",
    label: "bağışıklık",
  },
  {
    id: "detoks",
    pattern: /(?<![\p{L}\p{N}])detoks\p{L}*/giu,
    replacement: "fermantasyon",
    label: "detoks",
  },
  {
    id: "kolesterol",
    pattern: /(?<![\p{L}\p{N}])kolesterol\p{L}*/giu,
    replacement: "çözünür lif viskozitesi",
    label: "kolesterol",
  },
  {
    id: "diyabet",
    pattern: /(?<![\p{L}\p{N}])diyabet\p{L}*/giu,
    replacement: "karbonhidrat dönüşümü",
    label: "diyabet",
  },
  {
    id: "zayiflat",
    pattern: /(?<![\p{L}\p{N}])zayıflat\p{L}*/giu,
    replacement: "su bağlama",
    label: "zayıflatır",
  },
  {
    id: "kansizlik",
    pattern: /(?<![\p{L}\p{N}])kansızlığ?\p{L}*/giu,
    replacement: "fitat hidrolizi",
    label: "kansızlık",
  },
  {
    id: "hastaligi_onler",
    pattern: /hastalığ\p{L}*\s+önle\p{L}*/giu,
    replacement: "hamur kusurunu sınırlar",
    label: "hastalığı önler",
  },
];

function extractExcerpt(text: string, index: number, matchLen: number): string {
  const start = Math.max(0, index - 24);
  const end = Math.min(text.length, index + matchLen + 24);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

/**
 * K006 Sıfır Sağlık Beyanı Denetçisi (MARKA.md §3 & AGENTS.md §7).
 * Hem stüdyo kurallarını hem de vitrin `findHealthTerms` sözlüğünü birlikte çalıştırır;
 * yalnız klinik/tıbbi olmayan "hamuru korur / aromayı korur / kabuğu önler" gibi saf fiziksel
 * fırıncılık fiillerinde yanlış pozitif üretmeden doğrudan sağlık terimlerini yakalar.
 */
export function checkK006Compliance(text: string): StudyoK006Report {
  if (!text.trim()) {
    return { passed: true, violationCount: 0, violations: [] };
  }

  const normalized = trLower(text);
  const violations: StudyoK006Violation[] = [];
  const seenTerms = new Set<string>();

  for (const rule of K006_RULES) {
    const regex = new RegExp(rule.pattern.source, "giu");
    let match: RegExpExecArray | null = regex.exec(normalized);
    while (match) {
      const key = `${rule.label}@${match.index}`;
      if (!seenTerms.has(key)) {
        seenTerms.add(key);
        violations.push({
          term: match[0],
          suggestion: rule.replacement,
          excerpt: extractExcerpt(text, match.index, match[0].length),
        });
      }
      match = regex.exec(normalized);
    }
  }

  // Ek güvence: vitrin `findHealthTerms` kontrolünde "önler"/"korur" yalnız tıbbi bağlamda değilse bile
  // doğrudan sağlık terimlerini kaçırmamak için kontrol et (fiziksel "hamuru korur" hariç).
  const lintHits = findHealthTerms(normalized).filter(
    (term) => term !== "korur" && term !== "önler"
  );
  for (const term of lintHits) {
    const alreadyCaught = violations.some((v) => trLower(v.term).includes(term));
    if (!alreadyCaught) {
      const idx = normalized.indexOf(term);
      violations.push({
        term,
        suggestion: "fizikokimyasal süreç ifadesi kullanın",
        excerpt: idx >= 0 ? extractExcerpt(text, idx, term.length) : term,
      });
    }
  }

  return {
    passed: violations.length === 0,
    violationCount: violations.length,
    violations,
  };
}

/**
 * Tek tıkla K006 fizikokimyasal arındırma:
 * Tespit edilen tıbbi/sağlık terimlerini fırıncılık reolojisi karşılıklarıyla değiştirir.
 */
export function sanitizeK006Text(text: string): {
  cleaned: string;
  replacedCount: number;
} {
  let out = text;
  let replacedCount = 0;

  for (const rule of K006_RULES) {
    const regex = new RegExp(rule.pattern.source, "gu");
    let safetyCounter = 0;
    while (safetyCounter < 200) {
      safetyCounter += 1;
      const lowered = trLower(out);
      regex.lastIndex = 0;
      const match = regex.exec(lowered);
      if (!match) break;
      out =
        out.slice(0, match.index) +
        rule.replacement +
        out.slice(match.index + match[0].length);
      replacedCount += 1;
    }
  }

  return { cleaned: out, replacedCount };
}
