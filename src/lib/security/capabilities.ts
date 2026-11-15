import type { AuthRole } from "./apiAuth";

export type AdminCapability =
  | "dashboard.ops"
  | "dashboard.finance"
  | "orders.read"
  | "orders.ops"
  | "production.ops"
  | "products.manage"
  | "customers.read"
  | "cari.read"
  | "cari.write"
  | "cari.hot_sale"
  | "settings.manage"
  | "team.manage"
  | "audit.read"
  | "courier.dispatch";

export const ALL_ADMIN_CAPABILITIES: readonly AdminCapability[] = [
  "dashboard.ops",
  "dashboard.finance",
  "orders.read",
  "orders.ops",
  "production.ops",
  "products.manage",
  "customers.read",
  "cari.read",
  "cari.write",
  "cari.hot_sale",
  "settings.manage",
  "team.manage",
  "audit.read",
  "courier.dispatch",
] as const;

const ALL_CAPABILITY_SET: ReadonlySet<string> = new Set(ALL_ADMIN_CAPABILITIES);

const STAFF_CAPABILITIES: ReadonlySet<AdminCapability> = new Set([
  "dashboard.ops",
  "orders.read",
  "orders.ops",
  "production.ops",
]);

const COURIER_CAPABILITIES: ReadonlySet<AdminCapability> = new Set([
  "courier.dispatch",
  "cari.hot_sale",
]);

/**
 * Verilen kullanıcı rolünün belirtilen admin/operasyon yetkisine sahip olup olmadığını döndürür.
 * Saf fonksiyondur; bilinmeyen/null/customer roller her zaman `false` alır.
 */
export function hasCapability(
  role: AuthRole | string | null | undefined,
  capability: AdminCapability
): boolean {
  if (!role || !ALL_CAPABILITY_SET.has(capability)) {
    return false;
  }

  if (role === "superadmin" || role === "admin") {
    return true;
  }

  if (role === "staff") {
    return STAFF_CAPABILITIES.has(capability);
  }

  if (role === "courier") {
    return COURIER_CAPABILITIES.has(capability);
  }

  return false;
}

export function getRoleCapabilities(
  role: AuthRole | string | null | undefined
): AdminCapability[] {
  return ALL_ADMIN_CAPABILITIES.filter((cap) => hasCapability(role, cap));
}
