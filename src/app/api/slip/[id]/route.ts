import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Eksik ID" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase unconfigured" }, { status: 500 });
    }

    // 1. Try finding in `orders` table
    const { data: orderData, error: orderErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .maybeSingle();

    if (orderData) {
      let prevBal = 0;
      let newBal = 0;
      let taxNo = "";
      let busName = orderData.customer_name || "Değerli Müşterimiz";
      let historyItems: any[] = [];
      let phone = orderData.phone || "";
      let address = orderData.delivery_address || "";

      // If linked to a Cari, fetch Cari balance and history
      if (orderData.cari_id) {
        const { data: cariData } = await supabase
          .from("current_accounts")
          .select("*")
          .eq("id", orderData.cari_id)
          .maybeSingle();

        if (cariData) {
          busName = cariData.name || busName;
          taxNo = cariData.tax_id || "";
          newBal = Number(cariData.balance) || 0;
          prevBal = newBal - Number(orderData.total_amount || 0);
          phone = cariData.phone || phone;
          address = cariData.address || address;
        }

        const { data: hist } = await supabase
          .from("account_transactions")
          .select("*")
          .eq("account_id", orderData.cari_id)
          .order("date", { ascending: false })
          .limit(10);

        if (hist) {
          historyItems = hist.map((h: any) => ({
            id: h.id,
            date: h.date ? new Date(h.date).toISOString().split("T")[0] : "",
            type: h.type,
            description: h.description || "İşlem",
            amount: Number(h.amount) || 0,
          }));
        }
      }

      const rawItems = Array.isArray(orderData.order_items) ? orderData.order_items : (Array.isArray(orderData.items) ? orderData.items : []);
      const mappedItems = rawItems.map((it: any) => ({
        name: it.product_name || it.productName || it.name || "Ürün",
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unit_price) || Number(it.unitPrice) || Number(it.price) || 0,
        totalPrice: Number(it.total_price) || Number(it.totalPrice) || (Number(it.quantity) || 1) * (Number(it.unit_price) || Number(it.unitPrice) || 0),
        weight: it.weight,
      }));

      return NextResponse.json({
        success: true,
        data: {
          id: orderData.id,
          orderNumber: orderData.order_number || orderData.id.substring(0, 6).toUpperCase(),
          businessName: busName,
          phone: phone,
          address: address,
          neighborhood: orderData.neighborhood || "Beylikdüzü",
          taxNumber: taxNo,
          date: orderData.delivery_date ? new Date(orderData.delivery_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          timeWindow: orderData.delivery_time_window || "14:00 - 18:00",
          items: mappedItems,
          subtotal: Number(orderData.subtotal) || Number(orderData.total_amount) || 0,
          totalAmount: Number(orderData.total_amount) || 0,
          previousBalance: prevBal,
          paidAmount: 0,
          newBalance: newBal > 0 ? newBal : Number(orderData.total_amount) || 0,
          status: orderData.status,
          history: historyItems,
        }
      });
    }

    // 2. Try finding in `account_transactions` table if it was recorded as a Cari transaction
    const { data: txData, error: txError } = await supabase
      .from("account_transactions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (txData) {
      const { data: cariData } = await supabase
        .from("current_accounts")
        .select("*")
        .eq("id", txData.account_id)
        .maybeSingle();

      const busName = cariData?.name || "Kurumsal Müşteri";
      const taxNo = cariData?.tax_id || "";
      const curBal = Number(cariData?.balance) || 0;
      const amount = Number(txData.amount) || 0;
      const prevBal = curBal - amount;

      // Parse items from description if present
      // Example description: "[FİŞ-2609-007] 10x Taş Fırın Ekşi Mayalı Köy Ekmeği (110₺)"
      const desc = txData.description || "Toptan Ekmek Teslimatı";
      let cleanDesc = desc.replace(/^\[.*?\]\s*/, "").replace(/^(Fiş|Sipariş):\s*/i, "");
      
      let parsedQuantity = 1;
      let parsedName = cleanDesc;
      
      // Try to extract quantity "10x " from the start
      const match = cleanDesc.match(/^(\d+)x\s+(.*)$/);
      if (match) {
        parsedQuantity = parseInt(match[1], 10);
        parsedName = match[2];
      }
      
      // Try to remove "(110₺)" from the end of the name
      parsedName = parsedName.replace(/\s*\([\d.,]+[₺TL\s]*\)$/i, "").trim();

      const unitPrice = parsedQuantity > 0 ? amount / parsedQuantity : amount;

      return NextResponse.json({
        success: true,
        data: {
          id: txData.id,
          orderNumber: (txData.order_id || txData.id).substring(0, 6).toUpperCase(),
          businessName: busName,
          phone: cariData?.phone || "",
          address: cariData?.address || "",
          neighborhood: "Beylikdüzü",
          taxNumber: taxNo,
          date: txData.date ? new Date(txData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          timeWindow: "14:00 - 18:00",
          items: [
            {
              name: parsedName,
              quantity: parsedQuantity,
              unitPrice: unitPrice,
              totalPrice: amount,
            },
          ],
          subtotal: amount,
          totalAmount: amount,
          previousBalance: prevBal,
          paidAmount: 0,
          newBalance: curBal,
        }
      });
    }

    return NextResponse.json({ success: false, error: "Fiş bulunamadı" }, { status: 404 });

  } catch (error: any) {
    console.error("Fetch slip error:", error);
    // If it's a UUID syntax error from Postgres (22P02), it just means it wasn't found in transactions
    if (error?.code === "22P02") {
       return NextResponse.json({ success: false, error: "Fiş bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

