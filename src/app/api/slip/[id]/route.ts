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

    // Decode URL-encoded parameter (e.g. F%C4%B0%C5%9E-2609-579 -> FİŞ-2609-579)
    let decodedId = id;
    try {
      decodedId = decodeURIComponent(id).trim();
    } catch {
      decodedId = id.trim();
    }

    // Support both Turkish FİŞ- and ASCII FIS- versions
    const turkishSlip = decodedId.replace(/^FIS-/i, "FİŞ-");
    const asciiSlip = decodedId.replace(/^FİŞ-/i, "FIS-");
    const candidateIds = Array.from(new Set([decodedId, turkishSlip, asciiSlip].filter(Boolean)));

    // 1. Try finding in `orders` table by candidate IDs
    let { data: orderData } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .in("id", candidateIds)
      .maybeSingle();

    // 2. If not found in orders directly, search in `account_transactions`
    let txData: Record<string, unknown> | null = null;
    if (!orderData) {
      // Check if it's a valid UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedId);
      if (isUuid) {
        const { data: byId } = await supabase
          .from("account_transactions")
          .select("*")
          .eq("id", decodedId)
          .maybeSingle();
        if (byId) txData = byId;
      }

      // Check by slip_number
      if (!txData) {
        const { data: bySlip } = await supabase
          .from("account_transactions")
          .select("*")
          .in("slip_number", candidateIds)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (bySlip) txData = bySlip;
      }

      // Check by order_id
      if (!txData) {
        const { data: byOrdId } = await supabase
          .from("account_transactions")
          .select("*")
          .in("order_id", candidateIds)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (byOrdId) txData = byOrdId;
      }

      // Check by description containing slip code (e.g. "[FİŞ-2609-579]")
      if (!txData) {
        for (const cand of candidateIds) {
          const { data: byDesc } = await supabase
            .from("account_transactions")
            .select("*")
            .ilike("description", `%${cand}%`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (byDesc) {
            txData = byDesc;
            break;
          }
        }
      }

      // If txData has an order_id and orderData was not found, check linked order for rich order_items
      if (txData && txData.order_id) {
        const { data: linkedOrder } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("id", txData.order_id as string)
          .maybeSingle();
        if (linkedOrder && Array.isArray(linkedOrder.order_items) && linkedOrder.order_items.length > 0) {
          orderData = linkedOrder;
        }
      }
    }

    // Render from orderData if available
    if (orderData) {
      let prevBal = 0;
      let newBal = 0;
      let taxNo = "";
      let contactPerson = "";
      let busName = orderData.customer_name || "Değerli Müşterimiz";
      let historyItems: Record<string, unknown>[] = [];
      let phone = orderData.phone || "";
      let address = orderData.delivery_address || "";
      let neighborhood = orderData.neighborhood || "Beylikdüzü";

      // Extract time window and cariId from order_notes if present
      let timeWindow = (orderData.delivery_time_window as string) || "Sabah Sevkiyatı (07:00 - 09:00)";
      const timeMatch = (orderData.order_notes as string)?.match(/\[Dilim:\s*([^\]]+)\]/);
      if (timeMatch) timeWindow = timeMatch[1].trim();

      let linkedCariId = (orderData.cari_id as string) || undefined;
      const cariMatch = (orderData.order_notes as string)?.match(/\[Cari:\s*([^\]]+)\]/);
      if (cariMatch) linkedCariId = cariMatch[1].trim();

      // If linked to a Cari, fetch Cari balance, contact person, and history
      if (linkedCariId) {
        const { data: cariData } = await supabase
          .from("current_accounts")
          .select("*")
          .eq("id", linkedCariId)
          .maybeSingle();

        if (cariData) {
          busName = cariData.name || busName;
          contactPerson = cariData.contact_person || "";
          taxNo = cariData.tax_id || "";
          newBal = Number(cariData.balance) || 0;
          prevBal = newBal - Number(orderData.total_amount || 0);
          phone = cariData.phone || phone;
          address = cariData.address || address;
          neighborhood = cariData.neighborhood || neighborhood;
        }

        const { data: hist } = await supabase
          .from("account_transactions")
          .select("*")
          .eq("account_id", linkedCariId)
          .order("date", { ascending: false })
          .limit(10);

        if (hist) {
          historyItems = hist.map((h: Record<string, unknown>) => ({
            id: h.id,
            date: h.date ? new Date(h.date as string).toISOString().split("T")[0] : "",
            type: h.type,
            description: h.description || "İşlem",
            amount: Number(h.amount) || 0,
          }));
        }
      }

      const rawItems = Array.isArray(orderData.order_items) ? orderData.order_items : (Array.isArray(orderData.items) ? orderData.items : []);
      const mappedItems = rawItems.map((it: Record<string, unknown>) => ({
        name: (it.product_name as string) || (it.productName as string) || (it.name as string) || "Ürün",
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unit_price) || Number(it.unitPrice) || Number(it.price) || 0,
        totalPrice: Number(it.total_price) || Number(it.totalPrice) || (Number(it.quantity) || 1) * (Number(it.unit_price) || Number(it.unitPrice) || 0),
        weight: it.weight as number | undefined,
      }));

      return NextResponse.json({
        success: true,
        data: {
          id: orderData.id,
          orderNumber: orderData.order_number || orderData.id,
          businessName: busName,
          contactPerson,
          phone,
          address,
          neighborhood,
          taxNumber: taxNo,
          cariId: linkedCariId,
          date: orderData.delivery_date ? new Date(orderData.delivery_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          timeWindow,
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

    // Otherwise render from txData
    if (txData) {
      const { data: cariData } = await supabase
        .from("current_accounts")
        .select("*")
        .eq("id", txData.account_id)
        .maybeSingle();

      const busName = cariData?.name || "Kurumsal Müşteri";
      const contactPerson = cariData?.contact_person || "";
      const taxNo = cariData?.tax_id || "";
      const curBal = Number(cariData?.balance) || 0;
      const amount = Number(txData.amount) || 0;
      const prevBal = curBal - amount;

      // Parse items from description if present
      // Example: "[FİŞ-2609-007] 10x Taş Fırın Köy Ekmeği (110₺), 5x Çavdar Ekmeği (120₺)"
      const desc = (txData.description as string) || "Toptan Ekmek Teslimatı";
      let cleanDesc = desc.replace(/^\[.*?\]\s*/, "").replace(/^(Fiş|Sipariş):\s*/i, "");
      
      // Remove any trailing notes "| Not: ..."
      cleanDesc = cleanDesc.split(/\s*\|\s*Not:/i)[0].trim();

      const rawParts = cleanDesc.split(/,\s*/);
      const parsedItems = rawParts.map((part) => {
        const match = part.match(/^(\d+)x\s+(.*)$/);
        let qty = 1;
        let pName = part;
        if (match) {
          qty = parseInt(match[1], 10);
          pName = match[2];
        }
        
        let unitPrice = 0;
        const priceMatch = pName.match(/\(([\d.,]+)[₺TL\s]*\)/i);
        if (priceMatch) {
          unitPrice = parseFloat(priceMatch[1].replace(",", "."));
          pName = pName.replace(/\s*\([\d.,]+[₺TL\s]*\)$/i, "").trim();
        }

        const lineTotal = unitPrice > 0 ? unitPrice * qty : (rawParts.length === 1 ? amount : 0);
        return {
          name: pName.trim(),
          quantity: qty,
          unitPrice: unitPrice > 0 ? unitPrice : (amount / qty),
          totalPrice: lineTotal > 0 ? lineTotal : amount,
        };
      });

      const slipNo = (txData.slip_number as string) || (txData.order_id as string) || (txData.id as string).substring(0, 8).toUpperCase();

      return NextResponse.json({
        success: true,
        data: {
          id: txData.id,
          orderNumber: slipNo,
          businessName: busName,
          contactPerson,
          phone: cariData?.phone || "",
          address: cariData?.address || "",
          neighborhood: cariData?.neighborhood || "Beylikdüzü",
          taxNumber: taxNo,
          cariId: txData.account_id as string,
          date: txData.date ? new Date(txData.date as string).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          timeWindow: (txData.description as string)?.match(/\[Dilim:\s*([^\]]+)\]/)?.[1]?.trim() || "Sabah Sevkiyatı (07:00 - 09:00)",
          items: parsedItems.length > 0 ? parsedItems : [
            {
              name: "Toptan Ekmek Teslimatı",
              quantity: 1,
              unitPrice: amount,
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

  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error("Fetch slip error:", err);
    if (err?.code === "22P02") {
       return NextResponse.json({ success: false, error: "Fiş bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: err?.message || "Hata oluştu" }, { status: 500 });
  }
}

