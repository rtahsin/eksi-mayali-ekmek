import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/products/server";
import { logError } from "@/lib/kernel/log";

export const dynamic = "force-dynamic";

/** Vitrin kataloğu: aktif ürünler + görünür kategoriler (fiyatlar veritabanından). */
export async function GET() {
  try {
    const catalog = await getCatalog({ throwOnError: true });
    const cacheControl =
      catalog.products.length > 0
        ? "public, s-maxage=30, stale-while-revalidate=120"
        : "no-store";
    return NextResponse.json(catalog, {
      headers: { "Cache-Control": cacheControl },
    });
  } catch (err: unknown) {
    logError("GET /api/products failed", err);
    return NextResponse.json(
      { error: "Ürün kataloğu şu an yüklenemedi" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
