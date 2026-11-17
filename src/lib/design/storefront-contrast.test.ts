import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Read the shipped stylesheet so a CSS edit cannot silently invalidate these pairs.
const css = readFileSync(resolve(process.cwd(), "src/app/storefront-ui.css"), "utf8");
const brandCss = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
function variables(stylesheet: string, selector: string): Record<string, string> {
  const block = stylesheet.slice(stylesheet.indexOf(selector)).split("}")[0];
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map((match) => [match[1], match[2]]));
}
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const pair = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (pair[0] + 0.05) / (pair[1] + 0.05);
}

describe.each([
  ["gündüz", variables(brandCss, ":root"), variables(css, ":root")],
  ["gece B", variables(brandCss, "html.dark,"), variables(css, "html.dark")],
  ["gece A", variables(brandCss, 'html.dark[data-dark-variant="a"]'), variables(css, "html.dark")],
  ["eski gece tercihi", variables(brandCss, 'html.dark[data-dark-variant="old"]'), variables(css, "html.dark")],
] as const)("Vitrin kontrolleri / %s", (_name, palette, colors) => {
  it("ana eylemin küçük yazısı en az 4,5:1 kontrast sağlar", () => {
    expect(contrast(colors["sf-on-accent"], palette.accent)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(["bg", "surface"] as const)("%s üzerinde metin, alan sınırı ve odak görünürdür", (surface) => {
    for (const role of ["sf-error-ink", "sf-success-ink", "sf-warning-ink"]) {
      expect(contrast(colors[role], palette[surface]), role).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(colors["sf-control-line"], palette[surface])).toBeGreaterThanOrEqual(3);
    expect(contrast(palette.accent, palette[surface])).toBeGreaterThanOrEqual(3);
  });
});
