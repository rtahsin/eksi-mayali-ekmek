import type { KnowledgeGraph } from "../types";
import { claimHash } from "../define";
import type { ContentRef } from "../refs";

export function createGoodGraph(): KnowledgeGraph {
  const source1 = {
    kind: "makale" as const,
    title: "Sourdough Fermentation Mechanics",
    authors: ["A. Smith", "B. Baker"],
    year: 2024,
    doi: "10.1016/j.jfoodeng.2024.1001",
    verified: {
      via: "crossref" as const,
      at: "2024-05-10" as const,
    },
  };

  const concept1 = {
    kind: "olay" as const,
    name: "Fermentasyon",
    layers: {
      usta: "Hamurun kabarması",
      neden: "Mayaların gaz üretmesi",
      bilim: "CO2 ve organik asit sentezi",
    },
  };

  const claim1Draft = {
    text: "Laktik asit bakterileri hamur pH değerini 3.8 seviyesine düşürür.",
    about: ["fermentasyon"],
    evidence: [{ source: "ref_smith_2024" }] as const,
    status: "dogrulandi" as const,
    confidence: "yuksek" as const,
    review: null,
  };

  const hash = claimHash(claim1Draft);

  const claim1 = {
    ...claim1Draft,
    review: {
      by: "tahsin" as const,
      at: "2024-05-12" as const,
      hash,
    },
  };

  return {
    sources: { ref_smith_2024: source1 },
    concepts: { fermentasyon: concept1 },
    claims: { claim_ph_drop: claim1 },
  };
}

export const goodRefs: ContentRef[] = [
  {
    kind: "yazi",
    id: "yazi-1",
    status: "yayinda",
    surface: "icerik",
    claimIds: ["claim_ph_drop"],
    conceptIds: ["fermentasyon"],
    mediaIds: [],
  },
];
