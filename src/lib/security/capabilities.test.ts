import { describe, expect, it } from "vitest";
import {
  ALL_ADMIN_CAPABILITIES,
  getRoleCapabilities,
  hasCapability,
  type AdminCapability,
} from "./capabilities";

describe("RBAC yetki matrisi (hasCapability)", () => {
  it("admin ve superadmin tüm 14 yetkiye sahiptir", () => {
    expect(ALL_ADMIN_CAPABILITIES).toHaveLength(14);
    for (const cap of ALL_ADMIN_CAPABILITIES) {
      expect(hasCapability("superadmin", cap)).toBe(true);
      expect(hasCapability("admin", cap)).toBe(true);
    }
  });

  it("staff yalnız operasyonel 4 yetkiye sahiptir", () => {
    const allowed = new Set<AdminCapability>([
      "dashboard.ops",
      "orders.read",
      "orders.ops",
      "production.ops",
    ]);

    for (const cap of ALL_ADMIN_CAPABILITIES) {
      expect(hasCapability("staff", cap)).toBe(allowed.has(cap));
    }
    expect(getRoleCapabilities("staff")).toEqual([
      "dashboard.ops",
      "orders.read",
      "orders.ops",
      "production.ops",
    ]);
  });

  it("courier yalnız courier.dispatch ve cari.hot_sale yetkisine sahiptir", () => {
    const allowed = new Set<AdminCapability>(["courier.dispatch", "cari.hot_sale"]);

    for (const cap of ALL_ADMIN_CAPABILITIES) {
      expect(hasCapability("courier", cap)).toBe(allowed.has(cap));
    }
    expect(getRoleCapabilities("courier")).toEqual(["cari.hot_sale", "courier.dispatch"]);
  });

  it("customer, null, undefined ve bilinmeyen roller hiçbir yetkiye sahip değildir", () => {
    for (const role of ["customer", null, undefined, "", "guest", "owner"] as const) {
      for (const cap of ALL_ADMIN_CAPABILITIES) {
        expect(hasCapability(role, cap)).toBe(false);
      }
      expect(getRoleCapabilities(role)).toEqual([]);
    }
  });
});
