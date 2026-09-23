import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const {
      cariId,
      type,
      amount,
      description,
      paymentMethod,
      orderId,
      date,
      items,
      deliveryTimeWindow,
      status,
    } = await req.json();

    if (!cariId || !type || amount === undefined) {
      return NextResponse.json({ success: false, error: "Eksik parametre" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase unconfigured" }, { status: 500 });
    }

    // 1. Fetch current account to check type
    const { data: targetCari, error: cariErr } = await supabase
      .from("current_accounts")
      .select("type, name, account_type, balance, phone, address, neighborhood")
      .eq("id", cariId)
      .single();

    if (cariErr || !targetCari) {
      return NextResponse.json({ success: false, error: "Cari hesap bulunamadı" }, { status: 404 });
    }

    const rawAccountType = targetCari.account_type || targetCari.type || "musteri";
    const isExpenseAccount = rawAccountType === "gider";
    const parsedAmount = Number(amount);

    let balanceDelta = 0;
    if (type === "satis" || type === "devir") {
      balanceDelta = parsedAmount;
    } else if (type === "tahsilat") {
      balanceDelta = -parsedAmount;
    } else if (type === "odeme") {
      balanceDelta = isExpenseAccount ? -parsedAmount : parsedAmount;
    }

    // 2. Generate slip number for satış, tahsilat, devir
    let slipNumber: string | null = null;
    try {
      const { data: generatedSlip, error: slipErr } = await supabase.rpc("generate_slip_number");
      if (!slipErr && generatedSlip) {
        slipNumber = generatedSlip as string;
      }
    } catch {
      // RPC might not exist, proceed to fallback
    }

    // Fallback slip generator in JS if RPC is unavailable
    if (!slipNumber) {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yymm = `${yy}${mm}`;

      try {
        const { data: recentTxs } = await supabase
          .from("account_transactions")
          .select("description")
          .ilike("description", `%FİŞ-${yymm}-%`)
          .order("created_at", { ascending: false })
          .limit(20);

        let maxSeq = 0;
        if (recentTxs) {
          for (const r of recentTxs) {
            const m = r.description?.match(/FİŞ-\d{4}-(\d+)/);
            if (m) {
              const seq = parseInt(m[1], 10);
              if (seq > maxSeq) maxSeq = seq;
            }
          }
        }
        slipNumber = `FİŞ-${yymm}-${String(maxSeq + 1).padStart(3, "0")}`;
      } catch {
        const rand = Math.floor(100 + Math.random() * 900);
        slipNumber = `FİŞ-${yymm}-${rand}`;
      }
    }

    // Format description to always include [FİŞ-YYMM-XXX] if not present
    let fullDescription = (description || "").trim();
    if (slipNumber && !fullDescription.includes(slipNumber)) {
      fullDescription = fullDescription ? `[${slipNumber}] ${fullDescription}` : `[${slipNumber}] Toptan Satış`;
    }

    // Auto-create order & order_items if items array is provided (B2B Slip)
    let finalOrderId = orderId || null;
    if (type === "satis" && items && Array.isArray(items) && items.length > 0 && !finalOrderId && slipNumber) {
      finalOrderId = slipNumber;
      try {
        const { error: ordErr } = await supabase.from("orders").insert({
          id: finalOrderId,
          customer_name: targetCari.name || "Kurumsal Cari",
          phone: targetCari.phone || "",
          delivery_address: targetCari.address || "Kurumsal Teslimat",
          neighborhood: targetCari.neighborhood || "",
          delivery_method: "courier",
          delivery_date: date || new Date().toISOString().split("T")[0],
          delivery_time_window: deliveryTimeWindow || "Sabah Sevkiyatı (07:00 - 09:00)",
          status: status || "teslim_edildi",
          payment_method: "cari",
          subtotal: parsedAmount,
          shipping_fee: 0,
          total_amount: parsedAmount,
          cari_id: cariId,
          order_notes: fullDescription,
        });

        if (!ordErr) {
          const itemInserts = items.map((it: { productId?: string; name: string; qty: number; price: number }) => ({
            order_id: finalOrderId,
            product_id: it.productId || null,
            product_name: it.name,
            quantity: Number(it.qty) || 1,
            unit_price: Number(it.price) || 0,
            total_price: (Number(it.qty) || 1) * (Number(it.price) || 0),
          }));
          await supabase.from("order_items").insert(itemInserts);
        } else {
          console.warn("Order auto-creation notice:", ordErr.message);
        }
      } catch (err) {
        console.warn("Order auto-creation error:", err);
      }
    }

    // 3. Calculate balance after this transaction
    const currentBalance = Number(targetCari.balance) || 0;
    const balanceAfter = currentBalance + balanceDelta;

    // 4. Insert Transaction with graceful column fallback
    let transactionId: string | null = null;

    // Try full insert first (if migration was run)
    const fullTxPayload = {
      account_id: cariId,
      type: type,
      amount: parsedAmount,
      description: fullDescription,
      payment_method: paymentMethod || null,
      order_id: finalOrderId,
      slip_number: slipNumber,
      balance_after: balanceAfter,
      date: date || new Date().toISOString().split("T")[0],
    };

    const { data: fullTxData, error: fullTxErr } = await supabase
      .from("account_transactions")
      .insert(fullTxPayload)
      .select("id")
      .maybeSingle();

    if (fullTxErr) {
      // If error is about non-existent columns (Postgres 42703), fallback to core columns
      console.warn("Full tx insert notice (falling back to core columns):", fullTxErr.message);

      const coreTxPayload = {
        account_id: cariId,
        type: type === "satis" ? "debt" : type === "tahsilat" ? "credit" : type,
        amount: parsedAmount,
        description: fullDescription,
        date: date || new Date().toISOString().split("T")[0],
      };

      const { data: coreTxData, error: coreTxErr } = await supabase
        .from("account_transactions")
        .insert(coreTxPayload)
        .select("id")
        .maybeSingle();

      if (coreTxErr) throw coreTxErr;
      transactionId = coreTxData?.id || null;
    } else {
      transactionId = fullTxData?.id || null;
    }

    // 5. Update Balance Safely (RPC with direct fallback)
    let finalBalance = balanceAfter;
    try {
      const { data: rpcBal, error: updErr } = await supabase.rpc("adjust_cari_balance", {
        p_account_id: cariId,
        p_delta: balanceDelta,
      });

      if (updErr || rpcBal === null || rpcBal === undefined) {
        // Direct table update fallback
        const { error: directErr } = await supabase
          .from("current_accounts")
          .update({
            balance: balanceAfter,
            updated_at: new Date().toISOString(),
          })
          .eq("id", cariId);

        if (directErr) {
          throw new Error("Bakiye güncellenemedi: " + directErr.message);
        }
        finalBalance = balanceAfter;
      } else {
        finalBalance = Number(rpcBal);
      }
    } catch {
      // Direct update fallback
      const { error: directErr } = await supabase
        .from("current_accounts")
        .update({
          balance: balanceAfter,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cariId);

      if (directErr) {
        throw new Error("Bakiye güncellenemedi: " + directErr.message);
      }
      finalBalance = balanceAfter;
    }

    return NextResponse.json({
      success: true,
      newBalance: finalBalance,
      slipNumber,
      balanceAfter: finalBalance,
      transactionId,
      orderId: finalOrderId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("Finans API Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
