import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import { isIsoDate, istanbulToday } from "@/lib/time/istanbul";
import {
  BakeLogInputSchema,
  MAX_PHOTO_BYTES,
  MEDIA_BUCKET,
  isPhotoType,
  mergeItems,
  photoPath,
  rowToBakeLog,
  type BakeLogRow,
} from "@/lib/bake/log";
import type { BakeLogDay, BakeProduct } from "@/types/bake";

const COLUMNS = "id, baked_at, day, items, photo_path, note, hidden";

/** Bir günün fırından çıktı kayıtları (gizliler dahil) ve formda seçilecek ekmekler. */
export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const day = new URL(request.url).searchParams.get("day") ?? istanbulToday();
  if (!isIsoDate(day)) return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const [logsRes, productsRes] = await Promise.all([
      supabase.from("bake_logs").select(COLUMNS).eq("day", day).order("baked_at", { ascending: false }),
      supabase
        .from("products")
        .select("id, name")
        .eq("is_active", true)
        .gt("capacity_units", 0)
        .order("display_order", { ascending: true }),
    ]);
    if (logsRes.error) throw logsRes.error;
    if (productsRes.error) throw productsRes.error;

    const publicUrl = (p: string) => supabase.storage.from(MEDIA_BUCKET).getPublicUrl(p).data.publicUrl;
    const body: BakeLogDay = {
      day,
      logs: ((logsRes.data ?? []) as BakeLogRow[]).map((r) => rowToBakeLog(r, publicUrl)),
      products: (productsRes.data ?? []) as BakeProduct[],
    };
    return NextResponse.json(body);
  } catch (err: unknown) {
    logError("bake-logs GET failed", err, { day });
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

/**
 * Yeni fırın çıkışı. multipart/form-data: `payload` (JSON: items, note) + isteğe bağlı `photo`
 * (telefonda küçültülmüş webp/jpeg). Saat ve gün sunucuda yazılır; ürün adları veritabanından alınır.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Form okunamadı" }, { status: 400 });

  let payload: unknown = null;
  try {
    payload = JSON.parse(String(form.get("payload") ?? "null"));
  } catch {
    // aşağıda doğrulama hatası döner
  }
  const parsed = BakeLogInputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
  }

  const photo = form.get("photo");
  const file = photo instanceof File && photo.size > 0 ? photo : null;
  if (file && !isPhotoType(file.type)) return NextResponse.json({ error: "Fotoğraf webp ya da jpeg olmalı" }, { status: 400 });
  if (file && file.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: "Fotoğraf çok büyük" }, { status: 400 });

  const items = mergeItems(parsed.data.items);
  if (items.length === 0 && !file) {
    return NextResponse.json({ error: "En az bir ürün adedi ya da fotoğraf gerekli" }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  const id = crypto.randomUUID();
  const day = istanbulToday();
  let uploaded: string | null = null;

  try {
    if (items.length > 0) {
      const { data: known, error } = await supabase
        .from("products")
        .select("id, name")
        .in("id", items.map((it) => it.productId));
      if (error) throw error;
      const names = new Map(((known ?? []) as BakeProduct[]).map((p) => [p.id, p.name]));
      const unknown = items.filter((it) => !names.has(it.productId));
      if (unknown.length) return NextResponse.json({ error: "Bilinmeyen ürün" }, { status: 400 });
      for (const it of items) it.name = names.get(it.productId) ?? it.name;
    }

    if (file && isPhotoType(file.type)) {
      const path = photoPath(day, id, file.type);
      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
      if (error) throw error;
      uploaded = path;
    }

    const { data, error } = await supabase
      .from("bake_logs")
      .insert({ id, day, items, photo_path: uploaded, note: parsed.data.note, created_by: guard.auth.userId })
      .select(COLUMNS)
      .single();
    if (error) throw error;

    const publicUrl = (p: string) => supabase.storage.from(MEDIA_BUCKET).getPublicUrl(p).data.publicUrl;
    return NextResponse.json({ log: rowToBakeLog(data as BakeLogRow, publicUrl) }, { status: 201 });
  } catch (err: unknown) {
    // Kayıt yazılamadıysa yüklenen fotoğraf sahipsiz kalmasın.
    if (uploaded) await supabase.storage.from(MEDIA_BUCKET).remove([uploaded]);
    logError("bake-logs POST failed", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
