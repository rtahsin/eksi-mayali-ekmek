export type ProductCategory = "bread" | "specialty" | "gurme";

export function normalizeCategory(rawCategory?: string): ProductCategory {
  if (!rawCategory) return "bread";
  const lower = rawCategory.toLowerCase();
  if (
    lower.includes("sarkuteri") ||
    lower.includes("şarküteri") ||
    lower.includes("pantry") ||
    lower.includes("gurme") ||
    lower.includes("mandira") ||
    lower.includes("mandıra") ||
    lower.includes("dairy")
  ) {
    return "gurme";
  }
  if (lower.includes("ozel") || lower.includes("özel") || lower.includes("specialty")) {
    return "specialty";
  }
  return "bread";
}
