import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Kullanıcı ID (userId) parametresi zorunludur", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Veritabanı bağlantısı kurulamadı", code: "DB_CONNECTION_ERROR" },
        { status: 500 }
      );
    }

    // Fetch user's orders with their line items
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (ordersErr) {
      throw ordersErr;
    }

    const formattedOrders = (orders || []).map((o) => ({
      ...o,
      items: o.order_items || [],
    }));

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      totalCount: formattedOrders.length,
    });
  } catch (err: unknown) {
    console.error("GET /api/orders/my error:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Siparişleriniz listelenirken hata oluştu", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
