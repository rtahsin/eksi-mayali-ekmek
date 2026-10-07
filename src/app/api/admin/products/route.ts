import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { getCatalog } from "@/lib/products/server";
import { slugify } from "@/lib/utils/slugify";
import { isIsoDate, istanbulToday } from "@/lib/time/istanbul";
import { upcomingSaleDates } from "@/lib/ordering/saleDates";
import { findHealthTerms } from "@/lib/knowledge/lint";

const money = z.number().finite().min(0).max(100000);
const intOrNull = (max: number) => z.number().int().min(0).max(max).nullable();
const strList = (max: number) => z.array(z.string().trim().min(1).max(80)).max(max);

const ProductSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{2,80}$/).optional(),
    name: z.string().trim().min(2, "Ürün adı en az 2 karakter").max(120),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Adres (slug) yalnız küçük harf, rakam ve tire içerebilir")
      .max(120)
      .optional(),
    description: z.string().max(4000).default(""),
    price: money,
    compareAtPrice: money.nullable().default(null),
    imageUrl: z.string().trim().max(1000).nullable().default(null),
    category: z.string().trim().min(1).max(60),
    weight: z.number().int().min(0).max(100000).default(0),
    weightUnit: z.enum(["g", "kg", "ml", "l", "adet"]).default("g"),
    isAvailable: z.boolean().default(true),
    isActive: z.boolean().default(true),
    isPopular: z.boolean().default(false),
    isNew: z.boolean().default(false),
    madeToOrder: z.boolean().default(false),
    availability: z.enum(["daily", "dates"]).default("daily"),
    saleDates: z
      .array(z.object({ date: z.string().refine(isIsoDate, "Tarih YYYY-AA-GG olmalı"), limit: intOrNull(10000) }))
      .max(120)
      .default([]),
    dailyLimit: intOrNull(10000).default(null),
    leadTimeDays: z.number().int().min(0).max(30).default(0),
    capacityUnits: z.number().int().min(0).max(100).default(1),
    bundleItems: z
      .array(z.object({ productId: z.string().min(1).max(80), quantity: z.number().int().min(1).max(100) }))
      .max(20)
      .default([]),
    crossSell: z.array(z.string().min(1).max(80)).max(6).default([]),
    displayOrder: z.number().int().min(0).max(100000).default(0),
    saleWeekdays: z.array(z.number().int().min(1).max(7)).max(7).nullable().default(null),
    ingredients: strList(40).default([]),
    flourTypes: strList(20).default([]),
    hydration: z.number().int().min(0).max(200).nullable().default(null),
    masterclass: z
      .object({
        flourHeritage: z.string().max(2000).optional(),
        technique: z.string().max(2000).optional(),
        healthBenefit: z.string().max(2000).optional(),
        pairingStorage: z.string().max(2000).optional(),
        videoUrl: z.string().max(500).optional(),
      })
      .nullable()
      .default(null),
  })
  .refine((p) => p.compareAtPrice === null || p.compareAtPrice > p.price, {
    message: "Kampanya için eski fiyat, satış fiyatından yüksek olmalı",
    path: ["compareAtPrice"],
  })
  .superRefine((p, ctx) => {
    const fieldsToCheck: [string, string | undefined][] = [
      ["name", p.name],
      ["description", p.description],
      ["flourHeritage", p.masterclass?.flourHeritage],
      ["technique", p.masterclass?.technique],
      ["healthBenefit", p.masterclass?.healthBenefit],
      ["pairingStorage", p.masterclass?.pairingStorage],
      ...((p.ingredients || []).map((ing, i) => [`ingredients[${i}]`, ing] as [string, string])),
      ...((p.flourTypes || []).map((fl, i) => [`flourTypes[${i}]`, fl] as [string, string])),
    ];

    for (const [pathKey, val] of fieldsToCheck) {
      if (val) {
        const terms = findHealthTerms(val);
        if (terms.length > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Ürün alanlarında yasaklı sağlık/şifa beyanı terimleri bulunamaz (K006): ${terms.join(", ")}`,
            path: [pathKey],
          });
        }
      }
    }
  });

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });
  return NextResponse.json(await getCatalog({ includeInactive: true, client: supabase }));
}

/** Tekil slug: istenen ya da addan türetilen; çakışırsa -2, -3… */
async function uniqueSlug(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  base: string,
  ownId: string | null
): Promise<string> {
  const root = base || "urun";
  const { data } = await supabase.from("products").select("id, slug").like("slug", `${root}%`);
  const taken = new Set(((data ?? []) as { id: string; slug: string | null }[]).filter((r) => r.id !== ownId).map((r) => r.slug));
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`;
  return `${root}-${crypto.randomUUID().slice(0, 6)}`;
}

export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

    const parsed = ProductSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }
    const p = parsed.data;

    // Mevcut ürün mü? (slug ancak admin açıkça değiştirirse değişir — eski linkler kırılmasın)
    const existing = p.id
      ? ((await supabase.from("products").select("id, slug").eq("id", p.id).maybeSingle()).data as { id: string; slug: string | null } | null)
      : null;

    const id = existing?.id ?? p.id ?? `prod_${slugify(p.name).slice(0, 40) || "urun"}_${crypto.randomUUID().slice(0, 4)}`;
    const wantedSlug = p.slug ?? existing?.slug ?? slugify(p.name);
    const slug = wantedSlug === existing?.slug ? wantedSlug : await uniqueSlug(supabase, wantedSlug, existing?.id ?? null);

    // Paket ve öneriler kendini içeremez
    const bundleItems = p.bundleItems.filter((b) => b.productId !== id);
    const crossSell = Array.from(new Set(p.crossSell.filter((c) => c !== id)));

    // İç içe paket yok: paketin içindekiler paket olamaz, başka bir paketin içindeki ürün paket olamaz
    if (bundleItems.length > 0) {
      const { data: comps, error: compErr } = await supabase
        .from("products")
        .select("id, name, bundle_items")
        .in("id", bundleItems.map((b) => b.productId));
      if (compErr) throw compErr;
      const nested = ((comps ?? []) as { name: string; bundle_items: unknown }[]).find(
        (c) => Array.isArray(c.bundle_items) && c.bundle_items.length > 0
      );
      if (nested) {
        return NextResponse.json({ error: `"${nested.name}" zaten bir paket; paket içine paket eklenemez.` }, { status: 400 });
      }
      const { data: parents, error: parentErr } = await supabase
        .from("products")
        .select("name")
        .contains("bundle_items", [{ product_id: id }])
        .limit(1);
      if (parentErr) throw parentErr;
      if (parents && parents.length > 0) {
        return NextResponse.json(
          { error: `Bu ürün "${(parents[0] as { name: string }).name}" paketinin içinde; kendisi paket yapılamaz.` },
          { status: 400 }
        );
      }
    }

    const hasSaleWeekdays = Array.isArray(p.saleWeekdays) && p.saleWeekdays.length > 0;
    const effectiveAvailability = hasSaleWeekdays ? "dates" : p.availability;

    const row = {
      id,
      slug,
      name: p.name,
      description: p.description,
      price: p.price,
      compare_at_price: p.compareAtPrice,
      image_url: p.imageUrl || null,
      category: p.category,
      weight: p.weight,
      weight_unit: p.weightUnit,
      is_available: p.isAvailable,
      is_active: p.isActive,
      is_popular: p.isPopular,
      is_new: p.isNew,
      made_to_order: p.madeToOrder,
      availability: effectiveAvailability,
      daily_limit: p.dailyLimit,
      lead_time_days: p.leadTimeDays,
      capacity_units: p.capacityUnits,
      bundle_items: bundleItems.length ? bundleItems.map((b) => ({ product_id: b.productId, quantity: b.quantity })) : null,
      cross_sell: crossSell,
      display_order: p.displayOrder,
      ingredients: p.ingredients,
      flour_types: p.flourTypes,
      hydration: p.hydration,
      masterclass: p.masterclass,
      sale_weekdays: p.saleWeekdays,
    };

    let saleDatesToSave = effectiveAvailability === "dates" ? p.saleDates : [];
    if (hasSaleWeekdays && saleDatesToSave.length === 0) {
      const generatedDates = upcomingSaleDates(p.saleWeekdays, istanbulToday(), 8);
      saleDatesToSave = generatedDates.map((d) => ({ date: d, limit: p.dailyLimit ?? null }));
    }

    // Ürün + gelecekteki satış günleri tek veritabanı işleminde (yarım kayıt kalmaz)
    const { error } = await supabase.rpc("admin_save_product", {
      p_product: row,
      p_sale_dates: saleDatesToSave,
      p_from: istanbulToday(),
    });
    if (error) throw error;

    return NextResponse.json({ success: true, id, slug });
  } catch (err: unknown) {
    console.error("POST /api/admin/products:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Kaydetme hatası" }, { status: 500 });
  }
}

/** Silme = arşiv (geçmiş siparişler ve fişler ürüne bağlı kalır). Tekrar etkinleştirmek için kaydedilir. */
export async function DELETE(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^[A-Za-z0-9_-]{2,80}$/.test(id)) return NextResponse.json({ error: "Geçersiz ürün" }, { status: 400 });

    const { error } = await supabase
      .from("products")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    console.error("DELETE /api/admin/products:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Arşivleme hatası" }, { status: 500 });
  }
}
