import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { slugify } from "@/lib/utils/slugify";

const CategorySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,60}$/).optional(),
  name: z.string().trim().min(2, "Kategori adı en az 2 karakter").max(60),
  description: z.string().trim().max(300).default(""),
  displayOrder: z.number().int().min(0).max(1000).default(0),
  isVisible: z.boolean().default(true),
});

export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

    const parsed = CategorySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }
    const c = parsed.data;

    let id = c.id;
    if (!id) {
      // Yeni kategori: addan türetilmiş tekil kimlik
      const base = slugify(c.name).slice(0, 50) || "kategori";
      const { data } = await supabase.from("categories").select("id").like("id", `${base}%`);
      const taken = new Set(((data ?? []) as { id: string }[]).map((r) => r.id));
      id = base;
      for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
    }

    const { error } = await supabase.from("categories").upsert(
      { id, name: c.name, description: c.description, display_order: c.displayOrder, is_visible: c.isVisible },
      { onConflict: "id" }
    );
    if (error) throw error;
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    console.error("POST /api/admin/categories:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

/** Yalnızca içinde (arşivlenmiş dahil) ürün olmayan kategori silinebilir; aksi halde gizlenmeli. */
export async function DELETE(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^[a-z0-9-]{2,60}$/.test(id)) return NextResponse.json({ error: "Geçersiz kategori" }, { status: 400 });

    const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category", id);
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: `Bu kategoride ${count} ürün var. Önce ürünleri taşıyın ya da kategoriyi gizleyin.` },
        { status: 409 }
      );
    }
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("DELETE /api/admin/categories:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
