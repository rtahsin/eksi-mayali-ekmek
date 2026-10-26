import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import { getProductSlug } from "@/lib/utils/slugify";
import { StorySchema, parseStory, storyProblems } from "@/lib/hikaye/story";
import { anSecenekleri, mediaBaseUrl } from "@/lib/hikaye/storyServer";

interface ProductRow {
  id: string;
  name: string;
  slug: string | null;
}

/** Ürünün "Nasıl yapılıyor" adımları, editör için Bilim anları ve dosya öneki. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const [productRes, storyRes] = await Promise.all([
      supabase.from("products").select("id, name, slug").eq("id", id).maybeSingle(),
      supabase.from("product_stories").select("steps").eq("product_id", id).maybeSingle(),
    ]);
    if (productRes.error) throw productRes.error;
    if (storyRes.error) throw storyRes.error;
    const product = productRes.data as ProductRow | null;
    if (!product) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });

    return NextResponse.json({
      product: { id: product.id, name: product.name, url: `/urun/${getProductSlug(product)}` },
      steps: parseStory((storyRes.data as { steps: unknown } | null)?.steps),
      anlar: anSecenekleri(),
      mediaBase: mediaBaseUrl(),
    });
  } catch (err: unknown) {
    logError("product story GET failed", err, { id });
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

/** Adımların tamamını kaydeder (sıra dahil). Boş liste ürün sayfasındaki bölümü kaldırır. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { steps?: unknown } | null;
  const parsed = StorySchema.safeParse(body?.steps);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
  }
  const problems = storyProblems(parsed.data, id, new Set(anSecenekleri().map((a) => a.id)));
  if (problems.length) return NextResponse.json({ error: problems.join(" · ") }, { status: 400 });

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const { data: product, error: productErr } = await supabase.from("products").select("id, name, slug").eq("id", id).maybeSingle();
    if (productErr) throw productErr;
    if (!product) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });

    const { error } = await supabase
      .from("product_stories")
      .upsert({ product_id: id, steps: parsed.data, updated_by: guard.auth.userId, updated_at: new Date().toISOString() });
    if (error) throw error;

    // Ürün sayfası hem kısa adıyla hem kimliğiyle açılabilir.
    revalidatePath(`/urun/${getProductSlug(product as ProductRow)}`);
    revalidatePath(`/urun/${id}`);
    return NextResponse.json({ ok: true, steps: parsed.data });
  } catch (err: unknown) {
    logError("product story PUT failed", err, { id });
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
