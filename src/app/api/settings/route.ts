import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/settings/server";
import { toPublicSettings } from "@/lib/settings/schema";
import { isPastCutoff } from "@/lib/time/istanbul";

export const dynamic = "force-dynamic";

/** Vitrin ve sepet için herkese açık işletme ayarları. */
export async function GET() {
  const settings = await getStoreSettings();
  return NextResponse.json(
    {
      settings: toPublicSettings(settings),
      isCutoffPassed: isPastCutoff(settings.orderCutoffTime),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
