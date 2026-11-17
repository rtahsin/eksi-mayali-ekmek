const whole = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const fractional = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Presentation only; never changes the amount submitted to the ordering API. */
export function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const amount = Object.is(value, -0) ? 0 : value;
  return `${(Number.isInteger(amount) ? whole : fractional).format(amount)}\u00a0₺`;
}
