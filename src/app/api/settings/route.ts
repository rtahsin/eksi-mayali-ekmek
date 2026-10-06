import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getStoreSettings } from "@/lib/settings/server";
import { toPublicSettings } from "@/lib/settings/schema";

const getCachedPublicSettings = unstable_cache(
  async () => {
    const settings = await getStoreSettings();
    return toPublicSettings(settings);
  },
  ["store_settings_public"],
  {
    revalidate: 60,
    tags: ["settings"],
  }
);

/** Vitrin ve sepet için herkese açık işletme ayarları. */
export async function GET() {
  const settings = await getCachedPublicSettings();
  return NextResponse.json(
    { settings },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
