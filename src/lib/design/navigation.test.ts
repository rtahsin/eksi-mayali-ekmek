import type { MouseEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleStorefrontAnchor } from "./navigation";

const origin = "https://shop.example.test";
function setup(pathname = "/", hash = "") {
  const browser = { location: { origin, pathname, hash }, dispatchEvent: vi.fn() };
  vi.stubGlobal("window", browser);
  vi.stubGlobal("HashChangeEvent", Event);
  return browser;
}
function click(href: string, options: Partial<MouseEvent<HTMLAnchorElement>> = {}) {
  const preventDefault = vi.fn();
  const event = { currentTarget: { href }, defaultPrevented: false, button: 0,
    ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, preventDefault, ...options };
  handleStorefrontAnchor(event as unknown as MouseEvent<HTMLAnchorElement>);
  return preventDefault;
}
afterEach(() => vi.unstubAllGlobals());

describe("ortak gezinme bağlantıları", () => {
  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])("yeni sekme ve değiştirilmiş tıklamayı tarayıcıya bırakır: %o", (options) => {
    const browser = setup();
    expect(click(`${origin}/#ekmekler`, options)).not.toHaveBeenCalled();
    expect(browser.location.hash).toBe("");
    expect(browser.dispatchEvent).not.toHaveBeenCalled();
  });
  it("ürün sayfasından ana sayfaya giden bağlantıyı normal izler", () => {
    setup("/urun/koy-ekmegi");
    expect(click(`${origin}/#ekmekler`)).not.toHaveBeenCalled();
  });
  it("başka bir sitenin bağlantısını ele geçirmez", () => {
    setup();
    expect(click("https://other.example.test/#ekmekler")).not.toHaveBeenCalled();
  });
  it("ana sayfadaki aynı bölüme yeniden tıklanınca katalog seçimini yeniler", () => {
    const browser = setup("/", "#gurme-lezzetler");
    expect(click(`${origin}/#gurme-lezzetler`)).toHaveBeenCalledOnce();
    expect(browser.location.hash).toBe("#gurme-lezzetler");
    expect(browser.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "hashchange" }));
  });
});
