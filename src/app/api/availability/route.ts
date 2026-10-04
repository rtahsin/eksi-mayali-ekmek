import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/settings/server";
import { computeDeliveryDates } from "@/lib/ordering/dates";

export const dynamic = "force-dynamic";

/** Sepetin tek doğruluk kaynağı: seçilebilir teslim tarihleri (İstanbul saatine göre). */
export async function GET() {
  const settings = await getStoreSettings();
  return NextResponse.json(
    {
      orderAcceptanceOpen: settings.orderAcceptanceOpen,
      cutoffTime: settings.orderCutoffTime,
      dates: computeDeliveryDates(settings),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
