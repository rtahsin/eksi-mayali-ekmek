import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import { MEDIA_BUCKET, MAX_PHOTO_BYTES } from "@/lib/bake/log";
import { MAX_VIDEO_BYTES, isStoryFileType, isVideoType, storyFilePath } from "@/lib/hikaye/story";

const BodySchema = z.object({ type: z.string(), size: z.number().int().positive() });

/**
 * Adım fotoğrafı/videosu için imzalı yükleme bağlantısı. Dosya tarayıcıdan doğrudan media
 * bucket'ına gider (video, sunucunun istek gövdesi sınırını aşar). Yol sunucuda kurulur.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  const { type, size } = parsed.data;
  if (!isStoryFileType(type)) {
    return NextResponse.json({ error: "Fotoğraf (webp/jpeg) ya da video (mp4, webm, mov) olmalı" }, { status: 400 });
  }
  const max = isVideoType(type) ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
  if (size > max) {
    return NextResponse.json(
      { error: isVideoType(type) ? "Video 50 MB'tan büyük; kısa bir klip seç ya da YouTube bağlantısı kullan" : "Fotoğraf çok büyük" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const { data: product, error: productErr } = await supabase.from("products").select("id").eq("id", id).maybeSingle();
    if (productErr) throw productErr;
    if (!product) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });

    const path = storyFilePath(id, crypto.randomUUID(), type);
    const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
    if (error) throw error;
    return NextResponse.json({ path, token: data.token, kind: isVideoType(type) ? "video" : "image" });
  } catch (err: unknown) {
    logError("product story upload sign failed", err, { id });
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
