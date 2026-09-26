import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST: Yeni Fiş / Tahsilat / İşlem Kaydet
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

    // 1. Fetch current account
    const { data: targetCari, error: cariErr } = await supabase
      .from("current_accounts")
      .select("type, name, account_type, balance")
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
      // proceed to fallback
    }

    // Fallback slip generator in JS
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

    // Format description
    let fullDescription = (description || "").trim();
    if (slipNumber && !fullDescription.includes(slipNumber)) {
      fullDescription = fullDescription ? `[${slipNumber}] ${fullDescription}` : `[${slipNumber}] Toptan Satış`;
    }

    // 3. Calculate balance after this transaction
    const currentBalance = Number(targetCari.balance) || 0;
    const balanceAfter = currentBalance + balanceDelta;

    // 4. Insert Transaction
    let transactionId: string | null = null;
    const fullTxPayload = {
      account_id: cariId,
      type: type,
      amount: parsedAmount,
      description: fullDescription,
      payment_method: paymentMethod || null,
      order_id: orderId || null,
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
      console.warn("Falling back to core columns for insert:", fullTxErr.message);
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

    // 5. Update Balance
    const { error: balErr } = await supabase
      .from("current_accounts")
      .update({
        balance: balanceAfter,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cariId);

    if (balErr) {
      // Rollback inserted transaction to preserve atomic balance consistency
      if (transactionId) {
        await supabase.from("account_transactions").delete().eq("id", transactionId);
      }
      throw new Error(`Cari bakiye güncellenemedi, hareket geri alındı: ${balErr.message}`);
    }

    return NextResponse.json({
      success: true,
      newBalance: balanceAfter,
      slipNumber,
      balanceAfter,
      transactionId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("Finans API POST Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT: Mevcut Fiş / İşlem Düzenle (1-A)
export async function PUT(req: Request) {
  try {
    const { transactionId, accountId, amount, description, date, paymentMethod } = await req.json();

    if (!transactionId || amount === undefined) {
      return NextResponse.json({ success: false, error: "Eksik parametre" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase unconfigured" }, { status: 500 });
    }

    // 1. Fetch old transaction
    const { data: oldTx, error: txErr } = await supabase
      .from("account_transactions")
      .select("*")
      .eq("id", transactionId)
      .maybeSingle();

    if (txErr || !oldTx) {
      return NextResponse.json({ success: false, error: "İşlem bulunamadı" }, { status: 404 });
    }

    const targetAccountId = accountId || oldTx.account_id;

    // 2. Fetch current account
    const { data: targetCari, error: cariErr } = await supabase
      .from("current_accounts")
      .select("balance")
      .eq("id", targetAccountId)
      .maybeSingle();

    if (cariErr || !targetCari) {
      return NextResponse.json({ success: false, error: "Cari hesap bulunamadı" }, { status: 404 });
    }

    const oldAmount = Number(oldTx.amount) || 0;
    const newAmount = Number(amount);
    const isDebt = oldTx.type === "satis" || oldTx.type === "devir" || oldTx.type === "debt";

    // Difference in amount
    const diff = newAmount - oldAmount;
    const balanceDelta = isDebt ? diff : -diff;

    const currentBalance = Number(targetCari.balance) || 0;
    const newBalance = currentBalance + balanceDelta;

    // Preserve existing slip number in description if present
    let updatedDesc = (description || oldTx.description || "").trim();
    const slipNumber = oldTx.slip_number || oldTx.description?.match(/\[(FİŞ-[^\]]+)\]/)?.[1];
    if (slipNumber && !updatedDesc.includes(slipNumber)) {
      updatedDesc = `[${slipNumber}] ${updatedDesc}`;
    }

    // 3. Update account_transactions row
    const updatePayload: Record<string, any> = {
      amount: newAmount,
      description: updatedDesc,
      date: date || oldTx.date,
      balance_after: newBalance,
    };
    if (paymentMethod !== undefined) {
      updatePayload.payment_method = paymentMethod;
    }

    const { error: updTxErr } = await supabase
      .from("account_transactions")
      .update(updatePayload)
      .eq("id", transactionId);

    if (updTxErr) {
      console.warn("Notice: update tx payload fallback:", updTxErr.message);
      // Fallback for core columns
      await supabase
        .from("account_transactions")
        .update({
          amount: newAmount,
          description: updatedDesc,
          date: date || oldTx.date,
        })
        .eq("id", transactionId);
    }

    // 4. Update current_accounts balance
    const { error: updCariErr } = await supabase
      .from("current_accounts")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetAccountId);

    if (updCariErr) {
      throw new Error("Cari bakiye güncellenemedi: " + updCariErr.message);
    }

    return NextResponse.json({
      success: true,
      newBalance,
      updatedTransaction: {
        id: transactionId,
        amount: newAmount,
        description: updatedDesc,
        date: date || oldTx.date,
        balanceAfter: newBalance,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("Finans API PUT Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE: Fiş / İşlem İptal Et & Sil (1-A)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get("transactionId") || searchParams.get("id");

    if (!transactionId) {
      return NextResponse.json({ success: false, error: "Eksik transactionId" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase unconfigured" }, { status: 500 });
    }

    // 1. Fetch old transaction
    const { data: oldTx, error: txErr } = await supabase
      .from("account_transactions")
      .select("*")
      .eq("id", transactionId)
      .maybeSingle();

    if (txErr || !oldTx) {
      return NextResponse.json({ success: false, error: "İşlem bulunamadı" }, { status: 404 });
    }

    // 2. Fetch current account
    const { data: targetCari, error: cariErr } = await supabase
      .from("current_accounts")
      .select("balance")
      .eq("id", oldTx.account_id)
      .maybeSingle();

    if (cariErr || !targetCari) {
      return NextResponse.json({ success: false, error: "Cari hesap bulunamadı" }, { status: 404 });
    }

    const oldAmount = Number(oldTx.amount) || 0;
    const isDebt = oldTx.type === "satis" || oldTx.type === "devir" || oldTx.type === "debt";

    // Reversing balance: deleting a debt reduces balance; deleting a payment increases balance
    const balanceDelta = isDebt ? -oldAmount : oldAmount;
    const currentBalance = Number(targetCari.balance) || 0;
    const newBalance = currentBalance + balanceDelta;

    // 3. Delete transaction row
    const { error: delErr } = await supabase
      .from("account_transactions")
      .delete()
      .eq("id", transactionId);

    if (delErr) {
      throw new Error("İşlem silinemedi: " + delErr.message);
    }

    // 4. Update current_accounts balance
    const { error: updCariErr } = await supabase
      .from("current_accounts")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", oldTx.account_id);

    if (updCariErr) {
      throw new Error("Bakiye geri alınamadı: " + updCariErr.message);
    }

    return NextResponse.json({
      success: true,
      newBalance,
      deletedTransactionId: transactionId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("Finans API DELETE Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PATCH: Doğrudan Bakiye Düzeltme & Devir Kaydı (2-A)
export async function PATCH(req: Request) {
  try {
    const { accountId, targetBalance, reason } = await req.json();

    if (!accountId || targetBalance === undefined) {
      return NextResponse.json({ success: false, error: "Eksik parametre" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase unconfigured" }, { status: 500 });
    }

    // 1. Fetch current account
    const { data: targetCari, error: cariErr } = await supabase
      .from("current_accounts")
      .select("name, balance")
      .eq("id", accountId)
      .maybeSingle();

    if (cariErr || !targetCari) {
      return NextResponse.json({ success: false, error: "Cari hesap bulunamadı" }, { status: 404 });
    }

    const currentBalance = Number(targetCari.balance) || 0;
    const newBalance = Number(targetBalance);
    const diff = newBalance - currentBalance;

    if (diff === 0) {
      return NextResponse.json({ success: true, newBalance, message: "Bakiye zaten aynı" });
    }

    const cleanReason = (reason || "Açılış/Devir Mutabakatı").trim();
    const descText = `Bakiye Düzeltme: ${cleanReason} (Eski: ${currentBalance.toLocaleString("tr-TR")} ₺ ➔ Yeni: ${newBalance.toLocaleString("tr-TR")} ₺)`;

    // 2. Insert Devir record in account_transactions
    const devirPayload = {
      account_id: accountId,
      type: "devir",
      amount: Math.abs(diff),
      description: descText,
      balance_after: newBalance,
      date: new Date().toISOString().split("T")[0],
    };

    const { error: txErr } = await supabase.from("account_transactions").insert(devirPayload);
    if (txErr) {
      console.warn("Devir tx insert notice (core fallback):", txErr.message);
      await supabase.from("account_transactions").insert({
        account_id: accountId,
        type: diff > 0 ? "debt" : "credit",
        amount: Math.abs(diff),
        description: descText,
        date: new Date().toISOString().split("T")[0],
      });
    }

    // 3. Directly update current_accounts balance to targetBalance
    const { error: updCariErr } = await supabase
      .from("current_accounts")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId);

    if (updCariErr) {
      throw new Error("Bakiye güncellenemedi: " + updCariErr.message);
    }

    return NextResponse.json({
      success: true,
      newBalance,
      diff,
      description: descText,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("Finans API PATCH Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
