import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/products/server";

export const dynamic = "force-dynamic";

/** Vitrin kataloğu: aktif ürünler + görünür kategoriler (fiyatlar veritabanından). */
export async function GET() {
  const catalog = await getCatalog();
  return NextResponse.json(catalog, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
  });
}
