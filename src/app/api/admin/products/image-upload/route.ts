import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import { MEDIA_BUCKET, MAX_PHOTO_BYTES } from "@/lib/bake/log";

const PHOTO_TYPES: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const MAX_SHOWCASE_VIDEO_BYTES = 16 * 1024 * 1024;

const BodySchema = z.object({
  type: z.string(),
  size: z.number().int().positive(),
  kind: z.enum(["cover", "cutout", "crumb", "spin", "video"]).optional().default("cover"),
});

/**
 * Ürün kapak veya 3D vitrin sahne medyası için imzalı yükleme bağlantısı.
 * Dosya tarayıcıdan doğrudan `media` bucket'ına gider; yol sunucuda kurulur.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });

  const { kind, size } = parsed.data;
  const mime = parsed.data.type.split(";")[0].trim().toLowerCase();

  let ext: string | undefined;
  if (kind === "video") {
    ext = VIDEO_TYPES[mime];
    if (!ext) {
      return NextResponse.json({ error: "Video mp4, webm ya da mov olmalı" }, { status: 400 });
    }
    if (size > MAX_SHOWCASE_VIDEO_BYTES) {
      return NextResponse.json({ error: "Video en fazla 16 MB olabilir" }, { status: 400 });
    }
  } else {
    ext = PHOTO_TYPES[mime];
    if (!ext) {
      return NextResponse.json({ error: "Görsel webp, jpeg ya da png olmalı" }, { status: 400 });
    }
    if (size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Fotoğraf çok büyük" }, { status: 400 });
    }
  }

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const path =
      kind === "cover"
        ? `urun-kapak/${crypto.randomUUID()}.${ext}`
        : `urun-vitrin/${kind}/${crypto.randomUUID()}.${ext}`;
    const bucket = supabase.storage.from(MEDIA_BUCKET);
    const { data, error } = await bucket.createSignedUploadUrl(path);
    if (error) throw error;
    return NextResponse.json({ path, token: data.token, url: bucket.getPublicUrl(path).data.publicUrl });
  } catch (err: unknown) {
    logError("product image upload sign failed", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
