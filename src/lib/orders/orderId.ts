/**
 * Sipariş kimliği doğrulama: URL'den gelen ham değer veritabanı sorgusuna girmeden önce
 * bilinen biçimlerden birine uymalıdır. (PostgREST `.or()` filtresine ham metin enjekte edilmesini önler.)
 *
 * - `ORD-XXXXXXXX`  → web siparişi `id`
 * - UUID            → admin/manuel sipariş `id`
 * - `SIP-YYMM-NNN`  → `order_number`
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORD_RE = /^ORD-[A-Z0-9]{4,40}$/i;
const SIP_RE = /^SIP-\d{4}-\d{3,6}$/i;

export type OrderLookup = { column: "id" | "order_number"; value: string };

export function parseOrderLookup(raw: string | null | undefined): OrderLookup | null {
  const value = (raw ?? "").trim();
  if (!value || value.length > 64) return null;
  if (SIP_RE.test(value)) return { column: "order_number", value: value.toUpperCase() };
  if (ORD_RE.test(value) || UUID_RE.test(value)) return { column: "id", value };
  return null;
}
