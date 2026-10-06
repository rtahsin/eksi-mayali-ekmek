import { z } from "zod";
import type { FunnelEvent, LearningSessionProps } from "./types";

export const MAX_PROPS_BYTE_SIZE = 2048;

/**
 * Props nesnesinin JSON bayt boyutunun 2 KB (2048 bayt) altında olduğunu doğrular.
 */
export function validatePropsSize(props: unknown): boolean {
  if (props === undefined || props === null) return true;
  try {
    const jsonStr = JSON.stringify(props);
    // UTF-8 bayt uzunluğu
    const byteLength = typeof Buffer !== "undefined"
      ? Buffer.byteLength(jsonStr, "utf8")
      : new TextEncoder().encode(jsonStr).length;
    return byteLength <= MAX_PROPS_BYTE_SIZE;
  } catch {
    return false;
  }
}

/**
 * Bir öğrenme oturumunun kaydedilmeye uygun olup olmadığını denetler (≥30 sn ya da ≥1 kart).
 */
export function isSessionEligible(session: { durationSeconds: number; cardsViewed: number }): boolean {
  return session.durationSeconds >= 30 || session.cardsViewed >= 1;
}

/**
 * %20 rastgele örnekleme saf fonksiyonu.
 */
export function shouldSampleSession(
  randomVal: number = Math.random(),
  sampleRate: number = 0.2
): boolean {
  return randomVal >= 0 && randomVal < sampleRate;
}

export const EventPayloadSchema = z.object({
  event: z.enum([
    "scan",
    "cart_open",
    "checkout_start",
    "order_ok",
    "order_error",
    "learning_session",
  ]),
  ref: z.string().regex(/^[a-z0-9_-]{1,40}$/).nullish(),
  code: z.string().max(40).optional(),
  orderId: z.string().max(40).optional(),
  env: z.enum(["production", "preview", "development"]).optional(),
  props: z
    .record(z.string(), z.unknown())
    .optional()
    .refine(validatePropsSize, {
      message: `Props JSON payload exceeds ${MAX_PROPS_BYTE_SIZE} bytes`,
    }),
});

export type EventPayload = z.infer<typeof EventPayloadSchema>;
