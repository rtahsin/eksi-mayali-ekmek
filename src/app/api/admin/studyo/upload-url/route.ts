import { NextResponse } from "next/server";
import { z } from "zod";
import { logError } from "@/lib/kernel/log";
import { requireAdmin } from "@/lib/security/apiAuth";
import { STUDYO_BUCKET } from "@/lib/studyo/constants";
import {
  buildStudyoUploadSpec,
  ensureStudyoBucket,
} from "@/lib/studyo/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";

const UploadRequestSchema = z.object({
  category: z.enum(["voice_take", "oven_clip", "ready_output"]),
  konuId: z.string(),
  format: z.enum(["kisa_01", "kisa_02", "seri_b", "uzun"]),
  sceneNo: z.number().int().min(1).max(99).optional(),
  mimeType: z.string().min(3).max(80),
  sizeBytes: z.number().int().positive(),
});

/**
 * Samsung S24 ve masaüstü tarayıcıdan özel `studyo` bucket'ına doğrudan imzalı yükleme
 * bağlantısı üretir. Böylece 50-100 MB taş fırın videoları ve 48 kHz WAV kayıtları
 * Vercel serverless gövde sınırına takılmadan doğrudan Supabase Storage'a gider.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const parsed = UploadRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz yükleme isteği." },
      { status: 400 }
    );
  }

  const spec = buildStudyoUploadSpec(parsed.data);
  if (!spec.ok) {
    return NextResponse.json({ error: spec.error }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase bulut bağlantısı yapılandırılmamış." },
      { status: 500 }
    );
  }

  try {
    await ensureStudyoBucket(admin);
    const { data, error } = await admin.storage
      .from(STUDYO_BUCKET)
      .createSignedUploadUrl(spec.path, { upsert: true });
    if (error || !data) {
      throw error ?? new Error("İmzalı yükleme bağlantısı üretilemedi.");
    }

    return NextResponse.json({
      bucket: STUDYO_BUCKET,
      path: spec.path,
      token: data.token,
    });
  } catch (err: unknown) {
    logError("studyo signed upload url failed", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
