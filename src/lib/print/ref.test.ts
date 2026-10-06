import { describe, it, expect } from "vitest";
import { isValidRef, normalizeRef, labelPath, labelUrl, siteHost } from "./ref";

describe("print/ref", () => {
  describe("isValidRef", () => {
    it("accepts valid codes (3-6 lowercase alphanumeric starting with letter)", () => {
      expect(isValidRef("kuzu")).toBe(true);
      expect(isValidRef("kafe2")).toBe(true);
      expect(isValidRef("abc")).toBe(true);
      expect(isValidRef("a12345")).toBe(true);
    });

    it("rejects invalid codes", () => {
      expect(isValidRef("")).toBe(false);
      expect(isValidRef("ab")).toBe(false); // too short (<3)
      expect(isValidRef("toolongcode")).toBe(false); // too long (>6)
      expect(isValidRef("1abc")).toBe(false); // starts with digit
      expect(isValidRef("KUZU")).toBe(false); // uppercase
      expect(isValidRef("ka-fe")).toBe(false); // contains hyphen
      expect(isValidRef(null)).toBe(false);
      expect(isValidRef(undefined)).toBe(false);
    });
  });

  describe("normalizeRef", () => {
    it("converts uppercase, handles Turkish characters, strips special chars, slices to 6", () => {
      expect(normalizeRef("KÖŞE")).toBe("kose");
      expect(normalizeRef("  KUZU! ")).toBe("kuzu");
      expect(normalizeRef("Şarküteri")).toBe("sarkut");
      expect(normalizeRef("Kafe 12")).toBe("kafe12");
    });
  });

  describe("labelPath and labelUrl", () => {
    it("generates simple path and url without ref", () => {
      expect(labelPath("koy")).toBe("/e/koy");
      expect(labelUrl("koy", null, "https://ekmeklab.tr")).toBe("https://ekmeklab.tr/e/koy");
    });

    it("generates path and url with valid ref", () => {
      expect(labelPath("koy", "kuzu")).toBe("/e/koy?n=kuzu");
      expect(labelUrl("koy", "kuzu", "https://ekmeklab.tr")).toBe("https://ekmeklab.tr/e/koy?n=kuzu");
    });

    it("ignores invalid ref", () => {
      expect(labelPath("koy", "invalid-code!")).toBe("/e/koy");
      expect(labelUrl("koy", "invalid-code!", "https://ekmeklab.tr")).toBe("https://ekmeklab.tr/e/koy");
    });
  });

  describe("siteHost", () => {
    it("extracts hostname cleanly", () => {
      expect(siteHost("https://ekmeklab.tr")).toBe("ekmeklab.tr");
      expect(siteHost("https://www.ekmeklab.tr/sub")).toBe("ekmeklab.tr");
      expect(siteHost("http://localhost:3000")).toBe("localhost:3000");
    });
  });
});
