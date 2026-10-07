import { describe, it, expect } from "vitest";
import { resolveTheme, type ThemePreference, type SystemTheme } from "./resolveTheme";

describe("resolveTheme (Faz I-02 - Menü ve Gece Teması)", () => {
  it("tercih 'light' olduğunda sistem ne olursa olsun 'light' döner", () => {
    expect(resolveTheme("light", "light")).toBe("light");
    expect(resolveTheme("light", "dark")).toBe("light");
  });

  it("tercih 'dark' olduğunda sistem ne olursa olsun 'dark' döner", () => {
    expect(resolveTheme("dark", "light")).toBe("dark");
    expect(resolveTheme("dark", "dark")).toBe("dark");
  });

  it("tercih 'system' olduğunda sistem temasını birebir yansıtır", () => {
    expect(resolveTheme("system", "light")).toBe("light");
    expect(resolveTheme("system", "dark")).toBe("dark");
  });

  it("tüm kombinasyon matrisini eksiksiz doğrular", () => {
    const preferences: ThemePreference[] = ["system", "light", "dark"];
    const systems: SystemTheme[] = ["light", "dark"];

    const results = preferences.flatMap((pref) =>
      systems.map((sys) => ({
        pref,
        sys,
        resolved: resolveTheme(pref, sys),
      }))
    );

    expect(results).toEqual([
      { pref: "system", sys: "light", resolved: "light" },
      { pref: "system", sys: "dark", resolved: "dark" },
      { pref: "light", sys: "light", resolved: "light" },
      { pref: "light", sys: "dark", resolved: "light" },
      { pref: "dark", sys: "light", resolved: "dark" },
      { pref: "dark", sys: "dark", resolved: "dark" },
    ]);
  });
});
