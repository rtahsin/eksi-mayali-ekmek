import { describe, expect, it } from "vitest";
import {
  hasShowcaseInteractiveMedia,
  isSafeShowcaseUrl,
  resolveSpecularTone,
  resolveSpinFrameUrls,
  wrapSpinFrameIndex,
} from "./showcase";

describe("isSafeShowcaseUrl", () => {
  it("accepts https:// and single-slash relative paths", () => {
    expect(isSafeShowcaseUrl("https://cdn.ekmeklab.tr/urun-vitrin/cutout/1.webp")).toBe(true);
    expect(isSafeShowcaseUrl("  /images/showcase/ekmek.webp  ")).toBe(true);
  });

  it("rejects javascript:, data:, http:, protocol-relative //, and empty values", () => {
    expect(isSafeShowcaseUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeShowcaseUrl("data:image/png;base64,AAAA")).toBe(false);
    expect(isSafeShowcaseUrl("http://cdn.ekmeklab.tr/a.webp")).toBe(false);
    expect(isSafeShowcaseUrl("//evil.example/a.webp")).toBe(false);
    expect(isSafeShowcaseUrl("")).toBe(false);
    expect(isSafeShowcaseUrl("   ")).toBe(false);
    expect(isSafeShowcaseUrl("https://")).toBe(false);
    expect(isSafeShowcaseUrl(null)).toBe(false);
  });
});

describe("resolveSpinFrameUrls", () => {
  it("preserves valid spinFrameUrls list and trims whitespace", () => {
    const urls = resolveSpinFrameUrls({
      spinFrameUrls: [
        "  https://cdn.ekmeklab.tr/spin/frame-00.webp  ",
        "/spin/frame-01.webp",
      ],
    });
    expect(urls).toEqual([
      "https://cdn.ekmeklab.tr/spin/frame-00.webp",
      "/spin/frame-01.webp",
    ]);
  });

  it("caps spinFrameUrls at 72 frames and ignores unsafe URLs", () => {
    const many = Array.from({ length: 80 }, (_, i) => `https://cdn.ekmeklab.tr/spin/f-${i}.webp`);
    const resolved = resolveSpinFrameUrls({
      spinFrameUrls: ["javascript:alert(1)", ...many],
    });
    expect(resolved).toHaveLength(72);
    expect(resolved[0]).toBe("https://cdn.ekmeklab.tr/spin/f-0.webp");
    expect(resolved[71]).toBe("https://cdn.ekmeklab.tr/spin/f-71.webp");
  });

  it("generates zero-padded frames from {00} pattern when spinFrameCount is in 12..72", () => {
    const resolved = resolveSpinFrameUrls({
      spinFramesUrlPattern: "https://cdn.ekmeklab.tr/siyez/spin/frame-{00}.webp",
      spinFrameCount: 12,
    });
    expect(resolved).toHaveLength(12);
    expect(resolved[0]).toBe("https://cdn.ekmeklab.tr/siyez/spin/frame-00.webp");
    expect(resolved[9]).toBe("https://cdn.ekmeklab.tr/siyez/spin/frame-09.webp");
    expect(resolved[11]).toBe("https://cdn.ekmeklab.tr/siyez/spin/frame-11.webp");
  });

  it("generates frames from {index} pattern", () => {
    const resolved = resolveSpinFrameUrls({
      spinFramesUrlPattern: "/urun-vitrin/spin/karakilcik-{index}.webp",
      spinFrameCount: 36,
    });
    expect(resolved).toHaveLength(36);
    expect(resolved[0]).toBe("/urun-vitrin/spin/karakilcik-0.webp");
    expect(resolved[35]).toBe("/urun-vitrin/spin/karakilcik-35.webp");
  });

  it("prefers spinFrameUrls over pattern when both are present", () => {
    const resolved = resolveSpinFrameUrls({
      spinFrameUrls: ["https://cdn.ekmeklab.tr/custom-0.webp"],
      spinFramesUrlPattern: "https://cdn.ekmeklab.tr/spin/frame-{00}.webp",
      spinFrameCount: 24,
    });
    expect(resolved).toEqual(["https://cdn.ekmeklab.tr/custom-0.webp"]);
  });

  it("falls back to pattern when spinFrameUrls is empty or contains only unsafe URLs", () => {
    const resolved = resolveSpinFrameUrls({
      spinFrameUrls: ["javascript:void(0)"],
      spinFramesUrlPattern: "https://cdn.ekmeklab.tr/spin/frame-{00}.webp",
      spinFrameCount: 12,
    });
    expect(resolved).toHaveLength(12);
    expect(resolved[0]).toBe("https://cdn.ekmeklab.tr/spin/frame-00.webp");
  });

  it("returns [] for missing showcase or out-of-range spinFrameCount or missing placeholder", () => {
    expect(resolveSpinFrameUrls(undefined)).toEqual([]);
    expect(resolveSpinFrameUrls(null)).toEqual([]);
    expect(
      resolveSpinFrameUrls({
        spinFramesUrlPattern: "https://cdn.ekmeklab.tr/spin/frame-{00}.webp",
        spinFrameCount: 11,
      }),
    ).toEqual([]);
    expect(
      resolveSpinFrameUrls({
        spinFramesUrlPattern: "https://cdn.ekmeklab.tr/spin/frame-{00}.webp",
        spinFrameCount: 73,
      }),
    ).toEqual([]);
    expect(
      resolveSpinFrameUrls({
        spinFramesUrlPattern: "https://cdn.ekmeklab.tr/spin/frame-{00}.webp",
        spinFrameCount: 24.5,
      }),
    ).toEqual([]);
    expect(
      resolveSpinFrameUrls({
        spinFramesUrlPattern: "https://cdn.ekmeklab.tr/spin/static.webp",
        spinFrameCount: 24,
      }),
    ).toEqual([]);
    expect(
      resolveSpinFrameUrls({
        spinFramesUrlPattern: "javascript:alert({index})",
        spinFrameCount: 24,
      }),
    ).toEqual([]);
  });
});

describe("wrapSpinFrameIndex", () => {
  it("wraps negative and overflowing indices modularly into 0..total-1", () => {
    expect(wrapSpinFrameIndex(0, 36)).toBe(0);
    expect(wrapSpinFrameIndex(35, 36)).toBe(35);
    expect(wrapSpinFrameIndex(36, 36)).toBe(0);
    expect(wrapSpinFrameIndex(37, 36)).toBe(1);
    expect(wrapSpinFrameIndex(73, 36)).toBe(1);
    expect(wrapSpinFrameIndex(-1, 36)).toBe(35);
    expect(wrapSpinFrameIndex(-36, 36)).toBe(0);
    expect(wrapSpinFrameIndex(-37, 36)).toBe(35);
    expect(Object.is(wrapSpinFrameIndex(-36, 36), -0)).toBe(false);
  });

  it("handles zero, negative totals, and non-finite inputs safely", () => {
    expect(wrapSpinFrameIndex(5, 0)).toBe(0);
    expect(wrapSpinFrameIndex(5, -12)).toBe(0);
    expect(wrapSpinFrameIndex(Number.NaN, 36)).toBe(0);
    expect(wrapSpinFrameIndex(5, Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("resolveSpecularTone", () => {
  it("returns explicit showcase specularTone when set", () => {
    expect(
      resolveSpecularTone({
        category: "bread",
        masterclass: { showcase: { specularTone: "frost" } },
      }),
    ).toBe("frost");
    expect(
      resolveSpecularTone({
        category: "mandira",
        masterclass: { showcase: { specularTone: "ember" } },
      }),
    ).toBe("ember");
  });

  it("defaults to frost for accompaniment categories and ember for bread categories", () => {
    expect(resolveSpecularTone({ category: "mandira", masterclass: undefined })).toBe("frost");
    expect(resolveSpecularTone({ category: "sarkuteri", masterclass: {} })).toBe("frost");
    expect(resolveSpecularTone({ category: "gurme", masterclass: { showcase: {} } })).toBe("frost");
    expect(resolveSpecularTone({ category: "bread", masterclass: undefined })).toBe("ember");
    expect(resolveSpecularTone({ category: "specialty", masterclass: undefined })).toBe("ember");
  });
});

describe("hasShowcaseInteractiveMedia", () => {
  it("reports false for all flags when showcase is empty or unsafe", () => {
    expect(hasShowcaseInteractiveMedia(null)).toEqual({
      hasCutout: false,
      hasCrumb: false,
      hasSpin: false,
      hasVideo: false,
    });
    expect(
      hasShowcaseInteractiveMedia({
        cutoutUrl: "javascript:alert(1)",
        crumbUrl: "",
        spinFrameUrls: ["data:image/webp;base64,xx"],
        ambientVideoUrl: "http://insecure.example/clip.mp4",
      }),
    ).toEqual({
      hasCutout: false,
      hasCrumb: false,
      hasSpin: false,
      hasVideo: false,
    });
  });

  it("detects each valid interactive showcase media layer independently", () => {
    expect(
      hasShowcaseInteractiveMedia({
        cutoutUrl: "https://cdn.ekmeklab.tr/cutout.webp",
        crumbUrl: "/images/crumb.webp",
        spinFramesUrlPattern: "https://cdn.ekmeklab.tr/spin/frame-{00}.webp",
        spinFrameCount: 24,
        ambientVideoUrl: "https://cdn.ekmeklab.tr/ambient.mp4",
      }),
    ).toEqual({
      hasCutout: true,
      hasCrumb: true,
      hasSpin: true,
      hasVideo: true,
    });
  });
});
