import crypto from "node:crypto";
import type { ClaimInput, SourceInput, ConceptInput } from "./types";

export const defineSources = <const T extends Record<string, SourceInput>>(t: T) => t;
export const defineClaims = <const T extends Record<string, ClaimInput>>(t: T) => t;
export const defineConcepts = <const T extends Record<string, ConceptInput>>(t: T) => t;

/**
 * İddianın kritik alanlarından kararlı karma üretir.
 * hash = { text, evidence, numbers, status, sensitivity }
 */
export function claimHash(c: ClaimInput): string {
  const payload = {
    text: c.text,
    evidence: c.evidence.map((e) => ({ source: e.source, locator: e.locator ?? null })),
    numbers: c.numbers ?? null,
    status: c.status,
    sensitivity: c.sensitivity ?? null,
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 12);
}
