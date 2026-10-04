import { NextResponse } from "next/server";
import { z } from "zod";
import { getStoreSettings } from "@/lib/settings/server";
import { computeDeliveryDates } from "@/lib/ordering/dates";
import { getCartAvailability } from "@/lib/ordering/loadAvailability";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Sepet boşken: genel seçilebilir günler. */
export async function GET() {
  const settings = await getStoreSettings();
  const dates = computeDeliveryDates(settings).map((d) => ({ ...d, available: true, reason: null, remainingCapacity: null }));
  return NextResponse.json(
    { orderAcceptanceOpen: settings.orderAcceptanceOpen, cutoffTime: settings.orderCutoffTime, dates },
    { headers: { "Cache-Control": "no-store" } }
  );
}

const CartSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().min(1).max(100), quantity: z.number().int().positive().max(100) }))
    .max(30),
});

/** Sepet içeriğine göre: her gün uygun mu, değilse neden (satış günü, limit, kapasite, hazırlık süresi). */
export async function POST(req: Request) {
  const parsed = CartSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz sepet" }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı" }, { status: 503 });
  }

  try {
    const settings = await getStoreSettings(supabase);
    const dates = await getCartAvailability(supabase, settings, parsed.data.items);
    return NextResponse.json(
      { orderAcceptanceOpen: settings.orderAcceptanceOpen, cutoffTime: settings.orderCutoffTime, dates },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    console.error("POST /api/availability:", err);
    return NextResponse.json({ error: "Uygun günler hesaplanamadı" }, { status: 503 });
  }
}
