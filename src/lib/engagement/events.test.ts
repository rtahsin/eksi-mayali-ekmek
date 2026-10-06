import { describe, it, expect } from "vitest";
import {
  EventPayloadSchema,
  validatePropsSize,
  isSessionEligible,
  shouldSampleSession,
  MAX_PROPS_BYTE_SIZE,
} from "./events";

describe("Engagement & Learning Events (P1-10)", () => {
  describe("Zod Validation (EventPayloadSchema)", () => {
    it("validates a standard funnel event", () => {
      const res = EventPayloadSchema.safeParse({
        event: "cart_open",
        ref: "qr_bagel",
      });
      expect(res.success).toBe(true);
    });

    it("validates a learning_session event with props", () => {
      const res = EventPayloadSchema.safeParse({
        event: "learning_session",
        props: {
          durationSeconds: 45,
          cardsViewed: 2,
          path: "/laboratuvar",
        },
        env: "preview",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.env).toBe("preview");
        expect(res.data.props?.durationSeconds).toBe(45);
      }
    });

    it("rejects unknown event types", () => {
      const res = EventPayloadSchema.safeParse({
        event: "unknown_hack_event",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("2 KB Props Size Validation (validatePropsSize)", () => {
    it("accepts null or undefined props", () => {
      expect(validatePropsSize(null)).toBe(true);
      expect(validatePropsSize(undefined)).toBe(true);
    });

    it("accepts props strictly under 2048 bytes", () => {
      const smallProps = {
        duration: 35,
        cards: 3,
        notes: "Maya fermantasyon sıcaklık eğrisi",
      };
      expect(validatePropsSize(smallProps)).toBe(true);
    });

    it("rejects props strictly exceeding 2048 bytes", () => {
      const largeProps = {
        bloat: "A".repeat(2100),
      };
      expect(validatePropsSize(largeProps)).toBe(false);

      const parsed = EventPayloadSchema.safeParse({
        event: "learning_session",
        props: largeProps,
      });
      expect(parsed.success).toBe(false);
    });

    it("validates exact boundary around MAX_PROPS_BYTE_SIZE", () => {
      // 2048 baytın tam altı ve üstü
      const baseLen = JSON.stringify({ x: "" }).length;
      const exactPayload = { x: "a".repeat(MAX_PROPS_BYTE_SIZE - baseLen) };
      expect(validatePropsSize(exactPayload)).toBe(true);

      const overPayload = { x: "a".repeat(MAX_PROPS_BYTE_SIZE - baseLen + 1) };
      expect(validatePropsSize(overPayload)).toBe(false);
    });
  });

  describe("Session Eligibility Threshold (isSessionEligible)", () => {
    it("accepts session with duration >= 30 seconds even with 0 cards", () => {
      expect(isSessionEligible({ durationSeconds: 30, cardsViewed: 0 })).toBe(true);
      expect(isSessionEligible({ durationSeconds: 120, cardsViewed: 0 })).toBe(true);
    });

    it("accepts session with cardsViewed >= 1 even with < 30 seconds", () => {
      expect(isSessionEligible({ durationSeconds: 10, cardsViewed: 1 })).toBe(true);
      expect(isSessionEligible({ durationSeconds: 5, cardsViewed: 4 })).toBe(true);
    });

    it("rejects session with < 30 seconds AND 0 cards", () => {
      expect(isSessionEligible({ durationSeconds: 29, cardsViewed: 0 })).toBe(false);
      expect(isSessionEligible({ durationSeconds: 5, cardsViewed: 0 })).toBe(false);
    });
  });

  describe("Sampling Logic (shouldSampleSession)", () => {
    it("returns true for random values strictly below sampleRate (default 0.2)", () => {
      expect(shouldSampleSession(0.0)).toBe(true);
      expect(shouldSampleSession(0.15)).toBe(true);
      expect(shouldSampleSession(0.1999)).toBe(true);
    });

    it("returns false for random values at or above sampleRate (default 0.2)", () => {
      expect(shouldSampleSession(0.2)).toBe(false);
      expect(shouldSampleSession(0.5)).toBe(false);
      expect(shouldSampleSession(0.99)).toBe(false);
    });
  });

  describe("Preview Event Environment (env='preview')", () => {
    it("correctly identifies and carries preview environment tag", () => {
      const payload = {
        event: "learning_session" as const,
        env: "preview" as const,
        props: { durationSeconds: 60, cardsViewed: 2 },
      };
      const parsed = EventPayloadSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.env).toBe("preview");
      }
    });
  });
});
