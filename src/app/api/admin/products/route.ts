import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";

export async function DELETE(request: Request) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // Try hard delete first
    const { error: delErr } = await supabase!
      .from("products")
      .delete()
      .eq("id", id);

    if (delErr) {
      console.warn("Product hard delete warning (falling back to soft delete):", delErr);
      // If foreign key exists or other restriction, soft delete
      const { error: updateErr } = await supabase!
        .from("products")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (updateErr) throw updateErr;
    }

    return NextResponse.json({ success: true, message: "Ürün başarıyla silindi", id });
  } catch (err: unknown) {
    console.error("API DELETE /api/admin/products error:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Silme hatası" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });
    }

    const body = await request.json();
    const id = body.id || `prod_${Date.now().toString(36)}`;

    const payload: any = {
      id,
      name: body.name,
      slug: body.slug || (body.name ? body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : id),
      description: body.description || "",
      price: Number(body.price) || 0,
      image_url: body.imageUrl || body.image_url || null,
      category: body.category || "bread",
      stock: Number(body.stock) || 25,
      weight: Number(body.weight) || 800,
      weight_unit: body.weightUnit || body.weight_unit || "g",
      made_to_order: Boolean(body.madeToOrder ?? body.made_to_order),
      is_popular: Boolean(body.isPopular ?? body.is_popular),
      is_new: Boolean(body.isNew ?? body.is_new),
      is_available: body.isAvailable !== false && body.is_available !== false,
      is_active: true,
      ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
      flour_types: Array.isArray(body.flourTypes ?? body.flour_types) ? (body.flourTypes ?? body.flour_types) : [],
      hydration: body.hydration ? Number(body.hydration) : null,
      atelier_placement: body.atelierPlacement || body.atelier_placement || null,
      masterclass: body.masterclass || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase!
      .from("products")
      .upsert(payload, { onConflict: "id" });

    if (error) throw error;

    return NextResponse.json({ success: true, product: payload });
  } catch (err: unknown) {
    console.error("API POST /api/admin/products error:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Kaydetme hatası" }, { status: 500 });
  }
}
