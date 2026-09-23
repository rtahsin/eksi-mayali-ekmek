import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface ParsedSlipItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weight?: number;
  imageUrl?: string;
}

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

    // Load products map for matching image and weight
    const { data: allProds } = await supabase
      .from("products")
      .select("id, name, price, image_url, weight");

    const getProductMeta = (itemName: string) => {
      if (!allProds) return { imageUrl: "", weight: undefined };
      const cleanTarget = itemName.trim().toLowerCase();
      const found = allProds.find(
        (p) =>
          p.name.trim().toLowerCase() === cleanTarget ||
          cleanTarget.includes(p.name.trim().toLowerCase()) ||
          p.name.trim().toLowerCase().includes(cleanTarget)
      );
      return {
        imageUrl: found?.image_url || "",
        weight: found?.weight || undefined,
      };
    };

    // 1. Try finding in `orders` table
    const { data: orderData } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .maybeSingle();

    if (orderData) {
      let prevBal = 0;
      let newBal = 0;
      let taxNo = "";
      let busName = orderData.customer_name || "Değerli Müşterimiz";
      let phone = orderData.phone || "";
      let address = orderData.delivery_address || "";
      let neighborhood = orderData.neighborhood || "Beylikdüzü";

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
          neighborhood = cariData.neighborhood || neighborhood;
        }
      }

      const rawItems = Array.isArray(orderData.order_items)
        ? orderData.order_items
        : Array.isArray(orderData.items)
        ? orderData.items
        : [];

      const mappedItems: ParsedSlipItem[] = rawItems.map((it: any) => {
        const itName = it.product_name || it.productName || it.name || "Ürün";
        const meta = getProductMeta(itName);
        const qty = Number(it.quantity) || 1;
        const uPrice = Number(it.unit_price) || Number(it.unitPrice) || Number(it.price) || 0;
        const tPrice = Number(it.total_price) || Number(it.totalPrice) || qty * uPrice;

        return {
          name: itName,
          quantity: qty,
          unitPrice: uPrice,
          totalPrice: tPrice,
          weight: it.weight || meta.weight,
          imageUrl: it.image_url || it.imageUrl || meta.imageUrl,
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          id: orderData.id,
          orderNumber: orderData.order_number || `ORD-${orderData.id.substring(0, 6).toUpperCase()}`,
          slipNumber: orderData.order_number || `ORD-${orderData.id.substring(0, 6).toUpperCase()}`,
          businessName: busName,
          phone: phone,
          address: address,
          neighborhood: neighborhood,
          taxNumber: taxNo,
          cariId: orderData.cari_id || null,
          date: orderData.delivery_date
            ? new Date(orderData.delivery_date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          timeWindow: orderData.delivery_time_window || "14:00 - 18:00",
          items: mappedItems,
          subtotal: Number(orderData.subtotal) || Number(orderData.total_amount) || 0,
          totalAmount: Number(orderData.total_amount) || 0,
          previousBalance: prevBal,
          paidAmount: 0,
          newBalance: newBal > 0 ? newBal : Number(orderData.total_amount) || 0,
          status: orderData.status,
        },
      });
    }

    // 2. Try finding in `account_transactions` table
    const { data: txData } = await supabase
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
      const isSatis = txData.type === "satis";
      const prevBal = isSatis ? curBal - amount : curBal + amount;

      // Extract slip number: either txData.slip_number or from description [FİŞ-YYMM-XXX]
      const slipMatch = txData.description?.match(/\[(FİŞ-[^\]]+)\]/i);
      const extractedSlipNumber =
        txData.slip_number ||
        (slipMatch ? slipMatch[1] : `FİŞ-${txData.id.substring(0, 6).toUpperCase()}`);

      // Clean description
      const desc = txData.description || "Toptan Ekmek Teslimatı";
      let cleanDesc = desc
        .replace(/\[FİŞ-[^\]]+\]\s*/gi, "")
        .replace(/^(Fiş|Sipariş):\s*/i, "")
        .trim();

      // Separate note if exists (e.g. "... | Not: zil çalmasın")
      let customNote = "";
      if (cleanDesc.includes("| Not:")) {
        const parts = cleanDesc.split("| Not:");
        cleanDesc = parts[0].trim();
        customNote = parts[1].trim();
      }

      // Parse multi-item string: e.g. "10x Taş Fırın Ekşi Mayalı Köy Ekmeği (85₺), 5x 3Lt Jersey Süt (120₺)"
      const itemStrings = cleanDesc.split(/,\s*(?=\d+x)/);
      const parsedItems: ParsedSlipItem[] = [];

      for (const rawItem of itemStrings) {
        const itemMatch = rawItem.trim().match(/^(\d+)x\s+(.*?)(?:\s*\(([\d.,]+)[₺TL\s]*\))?$/i);
        if (itemMatch) {
          const qty = parseInt(itemMatch[1], 10);
          const name = itemMatch[2].trim();
          const meta = getProductMeta(name);
          const price = itemMatch[3] ? parseFloat(itemMatch[3].replace(",", ".")) : (qty > 0 ? amount / qty : amount);

          parsedItems.push({
            name,
            quantity: qty,
            unitPrice: price,
            totalPrice: qty * price,
            weight: meta.weight,
            imageUrl: meta.imageUrl,
          });
        }
      }

      // Fallback if parsing failed
      if (parsedItems.length === 0) {
        const meta = getProductMeta(cleanDesc);
        parsedItems.push({
          name: cleanDesc || "Toptan Ekmek Teslimatı",
          quantity: 1,
          unitPrice: amount,
          totalPrice: amount,
          weight: meta.weight,
          imageUrl: meta.imageUrl,
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          id: txData.id,
          orderNumber: extractedSlipNumber,
          slipNumber: extractedSlipNumber,
          businessName: busName,
          phone: cariData?.phone || "",
          address: cariData?.address || "",
          neighborhood: cariData?.neighborhood || "Beylikdüzü",
          taxNumber: taxNo,
          cariId: txData.account_id,
          date: txData.date
            ? new Date(txData.date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          timeWindow: "14:00 - 18:00",
          items: parsedItems,
          subtotal: amount,
          totalAmount: amount,
          previousBalance: prevBal,
          paidAmount: 0,
          newBalance: curBal,
          notes: customNote,
        },
      });
    }

    return NextResponse.json({ success: false, error: "Fiş bulunamadı" }, { status: 404 });
  } catch (error: any) {
    console.error("Fetch slip error:", error);
    if (error?.code === "22P02") {
      return NextResponse.json({ success: false, error: "Fiş bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
