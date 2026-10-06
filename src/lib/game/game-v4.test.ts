import { describe, it, expect } from "vitest";
import { CARDS, CARDS_V4, toContentRefs } from "./content/cards";
import { PARAMS } from "./engine/params";
import { migrateProgress } from "./progress";
import { GRAPH } from "@/lib/knowledge/registry";
import { validateGraph } from "@/lib/knowledge/validate";
import type { LabProgressV3 } from "@/types/game";

describe("P1-05 Oyun ↔ Bilgi Motoru Testleri", () => {
  describe("35+ Kart Snapshot & v4 Sözleşmesi", () => {
    it("v4 kartlarının sayısı ve her kartın görünür alanları eksiksizdir", () => {
      expect(CARDS_V4.length).toBeGreaterThanOrEqual(35);
      expect(CARDS.length).toBe(CARDS_V4.length);

      for (const card of CARDS) {
        expect(card.id).toBeDefined();
        expect(card.name.length).toBeGreaterThan(0);
        expect(card.short.length).toBeGreaterThan(0);
        expect(card.why.length).toBeGreaterThan(0);
        expect(card.deep.length).toBeGreaterThan(0);
        expect(card.art.length).toBeGreaterThan(0);
        expect(card.sources.length).toBeGreaterThanOrEqual(1);

        // Her kaynak URL'si dahili kaynak linkidir (/kaynak/[id]), doi.org kuralı
        for (const s of card.sources) {
          expect(s.url.startsWith("/kaynak/")).toBe(true);
          expect(s.url.includes("doi.org")).toBe(false);
        }
      }
    });

    it("kart snapshot'ı kararlıdır ve tüm alanları içerir", () => {
      const summary = CARDS.slice(0, 35).map((c) => ({
        id: c.id,
        kind: c.kind,
        name: c.name,
        short: c.short,
        why: c.why,
        deep: c.deep,
        art: c.art,
      }));
      expect(summary).toMatchSnapshot();
    });

    it("toContentRefs kart adaptörü geçerli referanslar üretir ve K002 hatası vermez", () => {
      const refs = toContentRefs();
      expect(refs.length).toBe(CARDS_V4.length);
      const issues = validateGraph(GRAPH, refs);
      const errors = issues.filter((i) => i.severity === "error");
      expect(errors).toEqual([]);
    });
  });

  describe("Simülasyon Sabitleri (Param) Doğrulaması", () => {
    it("her Param ya claim ya fitted taşır ve literatür değerleri iddia aralığındadır", () => {
      const entries = Object.entries(PARAMS);
      expect(entries.length).toBeGreaterThanOrEqual(20);

      for (const [key, p] of entries) {
        expect(typeof p.value).toBe("number");

        if ("claim" in p) {
          expect(p.claim).toBeDefined();
          const claim = GRAPH.claims[p.claim];
          expect(claim).toBeDefined();

          // Eğer iddiada sayısal sınır belirtilmişse değer bu aralıkta olmalı
          if (claim.numbers && claim.numbers.length > 0) {
            const matchesNumber = claim.numbers.some((num) => {
              if (Array.isArray(num.value)) {
                return p.value >= num.value[0] && p.value <= num.value[1];
              }
              return p.value === num.value;
            });
            expect(matchesNumber).toBe(true);
          }
        } else {
          expect("fitted" in p).toBe(true);
          expect(typeof p.fitted).toBe("string");
          expect(p.fitted.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("İlerleme Göçü (migrateProgress)", () => {
    it("v3 ilerlemesini kayıpsız olarak v4'e aktarır", () => {
      const v3: LabProgressV3 = {
        version: 3,
        cards: ["f_sanfranciscensis", "gluten", "nisasta"],
        answered: ["kaynak", "sahte"],
        sezgi: { right: 2, total: 2 },
        best: { koy: 92, siyez: 88 },
        starter: {
          name: "Test Maya",
          flour: "tam_bugday",
          readyDay: 6,
          vigor: 0.9,
          acidity: 0.8,
          aceticShare: 0.3,
          labPerYeast: 100,
        },
        plays: 5,
        quests: ["ekşi"],
      };

      const v4 = migrateProgress(v3);
      expect(v4.v).toBe(4);
      expect(v4.cards.f_sanfranciscensis).toBeDefined();
      expect(v4.cards.gluten).toBeDefined();
      expect(v4.cards.nisasta).toBeDefined();
      expect(v4.predictions.kaynak).toBeDefined();
      expect(v4.predictions.sahte).toBeDefined();
      expect(v4.chapters.koy?.best).toBe(92);
      expect(v4.chapters.siyez?.best).toBe(88);
    });

    it("v1 ilerlemesini ve boş verileri güvenle işler", () => {
      const v1 = { best: { koy: 80 } };
      const v4FromV1 = migrateProgress(v1);
      expect(v4FromV1.v).toBe(4);
      expect(v4FromV1.chapters.koy?.best).toBe(80);

      const empty = migrateProgress(null);
      expect(empty.v).toBe(4);
      expect(Object.keys(empty.cards).length).toBe(0);
    });
  });
});
