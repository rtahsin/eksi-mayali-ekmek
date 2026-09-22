import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { cariId, type, amount, description, paymentMethod, orderId, date } = await req.json();

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
      .select("type, name")
      .eq("id", cariId)
      .single();

    if (cariErr || !targetCari) {
      return NextResponse.json({ success: false, error: "Cari hesap bulunamadı" }, { status: 404 });
    }

    const isExpenseAccount = targetCari.type === "gider" || targetCari.name?.toLowerCase().includes("gider");
    const parsedAmount = Number(amount);

    let balanceDelta = 0;
    if (type === "satis" || type === "devir") {
      balanceDelta = parsedAmount;
    } else if (type === "tahsilat") {
      balanceDelta = -parsedAmount;
    } else if (type === "odeme") {
      balanceDelta = isExpenseAccount ? -parsedAmount : parsedAmount;
    }

    // 2. Insert Transaction
    const { error: txErr } = await supabase.from("account_transactions").insert({
      account_id: cariId,
      type: type,
      amount: parsedAmount,
      description: description || "",
      payment_method: paymentMethod || null,
      order_id: orderId || null,
      date: date || new Date().toISOString().split("T")[0],
    });

    if (txErr) throw txErr;

    // 3. Update Balance Safely via RPC
    const { data: newBalance, error: updErr } = await supabase
      .rpc("adjust_cari_balance", { 
        p_account_id: cariId, 
        p_delta: balanceDelta 
      });

    if (updErr) {
      console.error("RPC Error:", updErr);
      throw new Error("Bakiye güncellenemedi: " + updErr.message);
    }

    return NextResponse.json({ success: true, newBalance });
  } catch (error: any) {
    console.error("Finans API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
