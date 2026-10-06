export const HEALTH_TERMS = [
  "sağlıklı",
  "şifa",
  "iyileştir",
  "tedavi",
  "önler",
  "korur",
  "bağışıklık",
  "detoks",
  "sindirimi kolay",
  "kansızlık",
  "kolesterol",
  "diyabet",
  "zayıflat",
] as const;

export const BENEFIT_VERBS = [
  "önler",
  "korur",
  "iyileştirir",
  "tedavi eder",
  "güçlendirir",
  "zayıflatır",
  "kolaylaştırır",
] as const;

export function findHealthTerms(text: string): string[] {
  const lower = text.toLowerCase();
  return HEALTH_TERMS.filter((term) => lower.includes(term.toLowerCase()));
}

export function hasBenefitVerb(text: string): boolean {
  const lower = text.toLowerCase();
  return BENEFIT_VERBS.some((verb) => lower.includes(verb.toLowerCase()));
}
