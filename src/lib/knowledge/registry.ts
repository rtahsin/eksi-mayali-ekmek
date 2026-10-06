import { sources } from "@content/sources";
import { claims } from "@content/claims";
import { concepts } from "@content/concepts";
import type { KnowledgeGraph } from "./types";

export const SOURCES = { ...sources };
export const CLAIMS = { ...claims };
export const CONCEPTS = { ...concepts };

export type SourceId = Extract<keyof typeof SOURCES, string>;
export type ClaimId = Extract<keyof typeof CLAIMS, string>;
export type ConceptId = Extract<keyof typeof CONCEPTS, string>;

export const GRAPH: KnowledgeGraph = {
  sources: SOURCES,
  claims: CLAIMS,
  concepts: CONCEPTS,
};

// Referansları AYRI ifadede derleme anında denetle (kopuk referans = tip hatası)
const _claimRefs: {
  readonly [K in ClaimId]: {
    readonly about: readonly ConceptId[];
    readonly supersededBy?: ClaimId;
    readonly evidence: readonly { readonly source: SourceId }[];
  };
} = CLAIMS;
void _claimRefs;
