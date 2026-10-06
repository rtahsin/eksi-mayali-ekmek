import type { CodexCard, CodexCardV4, CardKind, CardSource } from "@/types/game";
import { GRAPH, type ConceptId, type SourceId } from "@/lib/knowledge/registry";
import type { ContentRef } from "@/lib/knowledge/refs";

/**
 * Laboratuvar Defteri kartları v4 (MIMARI §2.5 / P1-05).
 * Görünür metin Concept.layers + nick + identity'den türetilir;
 * kaynaklar GRAPH.sources'tan (/kaynak/[id]) gelir.
 */

const CARD_STATS: Record<string, CodexCard["stats"]> = {
  f_sanfranciscensis: { shape: "Çubuk, zincir", sizeUm: "~0,8 × 2–4", tempOpt: "~33 °C", pH: "3,5'e kadar dayanır", eats: "Maltoz", makes: "Laktik + asetik asit, CO₂", foundIn: "Ekşi maya; un böcekleri" },
  l_plantarum: { shape: "Çubuk", tempOpt: "~30–35 °C", eats: "Glukoz, fruktoz, maltoz…", makes: "Laktik asit", foundIn: "Bitkiler, tahıl, turşu" },
  oncu_lab: { shape: "Kok çiftleri", tempOpt: "~25–30 °C", makes: "Laktik asit, CO₂", foundIn: "Un, bitkiler" },
  enterobakteri: { shape: "Kamçılı kısa çubuk", tempOpt: "~37 °C", pH: "~4,5 altında çekilir", makes: "Gaz, karışık asitler, kötü koku", foundIn: "Un, toprak" },
  k_humilis: { shape: "Oval hücre, tomurcuklanır", sizeUm: "~4–7", tempOpt: "~27 °C", pH: "Çok asit dayanımlı", eats: "Glukoz, fruktoz", makes: "CO₂, etanol", foundIn: "Ekşi maya" },
  s_cerevisiae: { shape: "Oval, tomurcuklanır", sizeUm: "~5–10", tempOpt: "~30–35 °C", eats: "Glukoz, fruktoz, maltoz", makes: "CO₂, etanol", foundIn: "Meyve, böcekler, ekşi maya" },
};

const CARD_SOURCES_MAP: Record<string, SourceId[]> = {
  f_sanfranciscensis: ["ganzle_1998", "zheng_2020"],
  l_plantarum: ["devuyst_2014", "zheng_2020"],
  oncu_lab: ["devuyst_2005", "devuyst_2014"],
  enterobakteri: ["devuyst_2005", "devuyst_2014"],
  k_humilis: ["ganzle_1998"],
  s_cerevisiae: ["devuyst_2005"],
  gluten: ["delcour_2010"],
  nisasta: ["delcour_2010"],
  amilaz: ["delcour_2010"],
  proteaz: ["ganzle_prot_2008", "thiele_2002"],
  maltoz: ["ganzle_1998"],
  co2: ["campbell_2020"],
  asitler: ["devuyst_2005"],
  tuz: ["delcour_2010"],
  fitaz: ["leenhardt_2005", "loponen_2018"],
  pentozan: ["delcour_2010"],
  aroma_2ap: ["thiele_2002"],
  olay_ardisiklik: ["devuyst_2005", "devuyst_2014"],
  olay_kabarcik: ["campbell_2020"],
  olay_otoliz: ["delcour_2010"],
  olay_soguk_su: ["delcour_2010"],
  olay_sicaklik_secer: ["ganzle_1998"],
  olay_dolap: ["devuyst_2005"],
  olay_firin: ["delcour_2010"],
  olay_buhar: ["delcour_2010"],
  olay_bayatlama: ["delcour_2010"],
  olay_kesme: ["delcour_2010"],
  efsane_hava: ["landis_2021", "reese_2020", "boiocchi_2017"],
  efsane_colyak: ["greco_2011"],
  efsane_olu_maya: ["devuyst_2014"],
  efsane_dolap_ekmek: ["delcour_2010"],
  tarih_shubayqa: ["arranz_2018"],
  tarih_karacadag: ["heun_1997"],
  tarih_cavdar: ["delcour_2010"],
  tarih_fruktan: ["loponen_2018"],
  olay_haslama: ["delcour_2010"],
  olay_catlak: ["delcour_2010"],
  olay_dusen_firin: ["delcour_2010"],
};

export const CARDS_V4: readonly CodexCardV4[] = [
  // ── Canlılar ──
  { concept: "f_sanfranciscensis", art: "lacS", microKey: "lacS", rare: true },
  { concept: "l_plantarum", art: "lacS" },
  { concept: "oncu_lab", art: "lacP", microKey: "lacP" },
  { concept: "enterobakteri", art: "ent", microKey: "ent" },
  { concept: "k_humilis", art: "yst", microKey: "yst", rare: true },
  { concept: "s_cerevisiae", art: "yst" },

  // ── Moleküller ve enzimler ──
  { concept: "gluten", art: "gluten", microKey: "gluten" },
  { concept: "nisasta", art: "nisasta", microKey: "nisasta" },
  { concept: "amilaz", art: "amilaz", microKey: "amilaz" },
  { concept: "proteaz", art: "proteaz", microKey: "proteaz" },
  { concept: "maltoz", art: "maltoz", microKey: "maltoz" },
  { concept: "co2", art: "co2", microKey: "co2" },
  { concept: "asitler", art: "asit", microKey: "asit" },
  { concept: "tuz", art: "tuz", microKey: "tuz" },
  { concept: "fitaz", art: "fitaz", microKey: "fitaz" },
  { concept: "pentozan", art: "pentozan", microKey: "pentozan" },
  { concept: "aroma_2ap", art: "aroma" },

  // ── Olaylar ve teknikler ──
  { concept: "olay_ardisiklik", art: "ardisiklik" },
  { concept: "olay_kabarcik", art: "kabarcik", microKey: "kabarcik" },
  { concept: "olay_otoliz", art: "otoliz" },
  { concept: "olay_soguk_su", art: "soguk_su" },
  { concept: "olay_sicaklik_secer", art: "sicaklik" },
  { concept: "olay_dolap", art: "dolap" },
  { concept: "olay_firin", art: "firin" },
  { concept: "olay_buhar", art: "buhar" },
  { concept: "olay_bayatlama", art: "bayatlama" },
  { concept: "olay_kesme", art: "kesme" },

  // ── Efsaneler ──
  { concept: "efsane_hava", art: "hava" },
  { concept: "efsane_colyak", art: "colyak" },
  { concept: "efsane_olu_maya", art: "olu_maya" },
  { concept: "efsane_dolap_ekmek", art: "dolap_ekmek" },

  // ── Tarih ve miras ──
  { concept: "tarih_shubayqa", art: "shubayqa" },
  { concept: "tarih_karacadag", art: "karacadag" },
  { concept: "tarih_cavdar", art: "cavdar" },
  { concept: "tarih_fruktan", art: "fruktan" },

  // ── Çavdar / Gece Yarısı ──
  { concept: "olay_haslama", art: "haslama" },
  { concept: "olay_catlak", art: "catlak" },
  { concept: "olay_dusen_firin", art: "dusen_firin" },
];

function buildSources(sourceIds: SourceId[]): CardSource[] {
  return sourceIds.map((srcId) => {
    const s = GRAPH.sources[srcId];
    if (!s) {
      return { citation: srcId, url: `/kaynak/${srcId}` };
    }
    const author = s.authors[0] || "Kaynak";
    const etAl = s.authors.length > 1 ? " ve ark." : "";
    const venue = s.venue ? `, ${s.venue}` : "";
    return {
      citation: `${author}${etAl} (${s.year})${venue}`,
      url: `/kaynak/${srcId}`,
    };
  });
}

export const CARDS: CodexCard[] = CARDS_V4.map((v4) => {
  const concept = GRAPH.concepts[v4.concept];
  const sourceIds = CARD_SOURCES_MAP[v4.concept] || [];
  const sources = buildSources(sourceIds);

  const card: CodexCard = {
    id: v4.concept,
    kind: (concept?.kind === "tahil" || concept?.kind === "un" ? "molekul" : concept?.kind || "olay") as CardKind,
    name: concept?.name || v4.concept,
    short: concept?.layers.usta || "",
    why: concept?.layers.neden || "",
    deep: concept?.layers.bilim || "",
    art: v4.art,
    sources,
  };

  if (concept?.latin) card.latin = concept.latin;
  if (concept?.nick) card.nick = concept.nick;
  if (v4.microKey) card.microKey = v4.microKey;
  if (v4.rare) card.rare = v4.rare;
  if (CARD_STATS[v4.concept]) card.stats = CARD_STATS[v4.concept];

  return card;
});

export const CARD_BY_ID: Record<string, CodexCard> = Object.fromEntries(
  CARDS.map((c) => [c.id, c])
);

export function cardForEntity(kind: string): CodexCard | undefined {
  return CARDS.find((c) => c.microKey === kind);
}

export const KIND_LABEL: Record<CardKind, string> = {
  canli: "Canlılar",
  molekul: "Moleküller & Enzimler",
  olay: "Olaylar",
  efsane: "Efsaneler",
  tarih: "Tarih & Miras",
};

/** Knowledge doğrulayıcısı için kart referansları adaptörü (K002) */
export function toContentRefs(): ContentRef[] {
  return CARDS_V4.map((c) => ({
    kind: "kart",
    id: c.concept,
    surface: "icerik",
    claimIds: [],
    conceptIds: [c.concept],
    mediaIds: [],
  }));
}
