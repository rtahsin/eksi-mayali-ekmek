import { z } from "zod";
import type { CartDateOption } from "@/types/settings";

const responseSchema = z.object({
  dates: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    label: z.string(),
    available: z.boolean(),
    reason: z.string().nullable(),
    remainingCapacity: z.number().nullable(),
  })),
});

export async function fetchDeliveryDates(items: { productId: string; quantity: number }[], signal?: AbortSignal): Promise<CartDateOption[]> {
  const response = await fetch("/api/availability", {
    method: "POST", cache: "no-store", signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload: unknown = await response.json();
  return responseSchema.parse(payload).dates;
}
