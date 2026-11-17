/** Katalog ve eski kayıtlı sepetlerde aynı ölçü birimi gösterimi. */
export function formatProductAmount(product: { weight: number; weightUnit?: string }): string {
  if (!Number.isFinite(product.weight) || product.weight <= 0) return "";
  const unit = product.weightUnit?.trim() || "g";
  if (unit.toLowerCase() === "ml" && product.weight >= 1000) {
    return `${(product.weight / 1000).toLocaleString("tr-TR")} L`;
  }
  return `${product.weight.toLocaleString("tr-TR")} ${unit}`;
}
