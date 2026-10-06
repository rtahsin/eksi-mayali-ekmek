import { GRAPH } from "@/lib/knowledge/registry";
import { articleIndex } from "./index";

export type SearchDocKind = "yazi" | "kavram" | "efsane";

export interface SearchDocument {
  id: string;
  kind: SearchDocKind;
  title: string;
  snippet: string;
  url: string;
  tags?: string[];
}

export interface InvertedIndex {
  docs: SearchDocument[];
  postings: Record<string, [number, number][]>; // token -> [docIndex, weight][]
}

export interface SearchResult {
  doc: SearchDocument;
  score: number;
  matchedTokens: string[];
}

/**
 * Türkçe metin normalizasyonu:
 * Küçük harfe çevirme, Türkçe karakterlerin (ı/i, ğ/g, ü/u, ş/s, ö/o, ç/c) eşlenmesi,
 * noktalama işaretlerinin temizlenmesi.
 */
export function normalizeTr(text: string): string {
  if (!text) return "";
  return text
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  "ve",
  "ile",
  "de",
  "da",
  "ki",
  "bu",
  "bir",
  "icin",
  "gibi",
  "kadar",
  "daha",
  "her",
  "en",
  "ama",
  "fakat",
]);

/**
 * Metni ayrıştırıp tekrarsız, normalize edilmiş anahtar kelimelere böler.
 */
export function tokenizeTr(text: string): string[] {
  const norm = normalizeTr(text);
  if (!norm) return [];
  const words = norm.split(" ");
  const unique = new Set<string>();
  for (const w of words) {
    if (w.length >= 2 && !STOP_WORDS.has(w)) {
      unique.add(w);
    }
  }
  return Array.from(unique);
}

/**
 * Verilen belge listesinden ters indeks (inverted index) üretir.
 */
export function buildIndex(docs: SearchDocument[]): InvertedIndex {
  const postings: Record<string, [number, number][]> = {};

  docs.forEach((doc, docIdx) => {
    // 1. Başlık tokenları (Ağırlık: 10)
    const titleTokens = tokenizeTr(doc.title);
    for (const t of titleTokens) {
      if (!postings[t]) postings[t] = [];
      postings[t].push([docIdx, 10]);
    }

    // 2. Etiket / anahtar kelimeler (Ağırlık: 6)
    if (doc.tags) {
      for (const tag of doc.tags) {
        const tagTokens = tokenizeTr(tag);
        for (const t of tagTokens) {
          if (!postings[t]) postings[t] = [];
          // Zaten başlıkta varsa küçük bir ek puan
          const existing = postings[t].find(([idx]) => idx === docIdx);
          if (existing) {
            existing[1] += 4;
          } else {
            postings[t].push([docIdx, 6]);
          }
        }
      }
    }

    // 3. Özet / snippet tokenları (Ağırlık: 2)
    const snippetTokens = tokenizeTr(doc.snippet);
    for (const t of snippetTokens) {
      if (!postings[t]) postings[t] = [];
      const existing = postings[t].find(([idx]) => idx === docIdx);
      if (existing) {
        existing[1] += 1;
      } else {
        postings[t].push([docIdx, 2]);
      }
    }
  });

  return { docs, postings };
}

/**
 * Bilgi grafiği (kavramlar + efsaneler) ve kütüphane yazılarından
 * tüm belgeleri toplayarak tam statik indeks oluşturur.
 */
export function buildSearchIndex(): InvertedIndex {
  const docs: SearchDocument[] = [];

  // 1. Yazılar
  const articles = articleIndex();
  for (const a of articles) {
    docs.push({
      id: `yazi:${a.slug}`,
      kind: "yazi",
      title: a.title,
      snippet: a.summary,
      url: `/kutuphane/${a.slug}`,
      tags: [...a.concepts],
    });
  }

  // 2. Kavramlar
  for (const [id, concept] of Object.entries(GRAPH.concepts)) {
    const title = concept.nick ? `${concept.name} (${concept.nick})` : concept.name;
    const snippet = concept.layers?.neden || concept.layers?.usta || concept.layers?.bilim || "";
    const tags: string[] = [];
    if (concept.aliases) tags.push(...concept.aliases);
    if (concept.latin) tags.push(concept.latin);

    docs.push({
      id: `kavram:${id}`,
      kind: "kavram",
      title,
      snippet,
      url: `/kavram/${id}`,
      tags,
    });
  }

  // 3. Efsaneler
  for (const [id, claim] of Object.entries(GRAPH.claims)) {
    if (claim.status === "efsane") {
      const targetConcept = claim.about[0];
      docs.push({
        id: `efsane:${id}`,
        kind: "efsane",
        title: `Doğru Bilinen Yanlış: ${claim.text}`,
        snippet: claim.text,
        url: targetConcept ? `/kavram/${targetConcept}` : `/kavram`,
        tags: [...claim.about],
      });
    }
  }

  return buildIndex(docs);
}

// Önbelleklenmiş tekil indeks
let _cachedIndex: InvertedIndex | null = null;

export function getSearchIndex(): InvertedIndex {
  if (!_cachedIndex) {
    _cachedIndex = buildSearchIndex();
  }
  return _cachedIndex;
}

/**
 * İndeks üzerinde arama sorgusu çalıştırır.
 */
export function searchIndex(
  index: InvertedIndex,
  query: string,
  limit = 15
): SearchResult[] {
  const queryTokens = tokenizeTr(query);
  if (queryTokens.length === 0) return [];

  const normQuery = normalizeTr(query);
  const scores = new Map<number, { score: number; matched: Set<string> }>();

  for (const qToken of queryTokens) {
    for (const [token, entries] of Object.entries(index.postings)) {
      let matchWeight = 0;
      if (token === qToken) {
        matchWeight = 1.0;
      } else if (token.startsWith(qToken)) {
        matchWeight = 0.7;
      } else if (qToken.length >= 4 && token.includes(qToken)) {
        matchWeight = 0.4;
      }

      if (matchWeight > 0) {
        for (const [docIdx, fieldWeight] of entries) {
          const cur = scores.get(docIdx) || { score: 0, matched: new Set<string>() };
          cur.score += fieldWeight * matchWeight;
          cur.matched.add(qToken);
          scores.set(docIdx, cur);
        }
      }
    }
  }

  const results: SearchResult[] = [];
  for (const [docIdx, data] of scores.entries()) {
    const doc = index.docs[docIdx];
    if (!doc) continue;

    let finalScore = data.score;
    // Bütün sorgu kelimeleri eşleştiyse büyük bonus
    if (data.matched.size === queryTokens.length) {
      finalScore *= 2.0;
    }
    // Tam başlık eşleşme bonusu
    const docNormTitle = normalizeTr(doc.title);
    if (docNormTitle.includes(normQuery)) {
      finalScore *= 1.5;
    }

    results.push({
      doc,
      score: Math.round(finalScore * 10) / 10,
      matchedTokens: Array.from(data.matched),
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
