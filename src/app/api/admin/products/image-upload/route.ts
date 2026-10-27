import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import { MEDIA_BUCKET, MAX_PHOTO_BYTES } from "@/lib/bake/log";

const PHOTO_TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg" };

const BodySchema = z.object({ type: z.string(), size: z.number().int().positive() });

/**
 * Ürün kapak fotoğrafı için imzalı yükleme bağlantısı. Fotoğraf telefonda küçültülüp tarayıcıdan
 * doğrudan media bucket'ına gider; yol sunucuda kurulur. Yeni üründe kimlik henüz olmadığından yol
 * ürüne bağlı değil; ürüne bağlanması kayıtta `imageUrl` ile olur.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  const ext = PHOTO_TYPES[parsed.data.type];
  if (!ext) return NextResponse.json({ error: "Fotoğraf webp ya da jpeg olmalı" }, { status: 400 });
  if (parsed.data.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: "Fotoğraf çok büyük" }, { status: 400 });

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const path = `urun-kapak/${crypto.randomUUID()}.${ext}`;
    const bucket = supabase.storage.from(MEDIA_BUCKET);
    const { data, error } = await bucket.createSignedUploadUrl(path);
    if (error) throw error;
    return NextResponse.json({ path, token: data.token, url: bucket.getPublicUrl(path).data.publicUrl });
  } catch (err: unknown) {
    logError("product image upload sign failed", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
