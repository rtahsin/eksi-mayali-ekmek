import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Generates sequential, collision-free order numbers in the format: SIP-YYMM-XXX
 * Example: SIP-2609-001, SIP-2609-002 ...
 * Resets back to 001 at the beginning of each month.
 */
export async function generateOrderNumber(date: Date = new Date()): Promise<string> {
  const yy = date.getFullYear().toString().slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const prefix = `SIP-${yy}${mm}-`;

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      throw new Error("Supabase admin istemcisi başlatılamadı.");
    }

    // 1. PostgreSQL Atomic RPC call
    const { data: rpcData, error: rpcErr } = await supabase.rpc("generate_order_number");
    if (!rpcErr && typeof rpcData === "string" && rpcData.startsWith("SIP-")) {
      return rpcData;
    }

    if (rpcErr) {
      console.warn("generate_order_number RPC hatası, sorgu fallback deneniyor:", rpcErr.message || rpcErr);
    }

    // 2. Fallback: Query highest order number for current year/month
    const { data, error } = await supabase
      .from("orders")
      .select("order_number")
      .like("order_number", `${prefix}%`)
      .order("order_number", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Mevcut sipariş numaraları sorgulanamadı:", error);
      throw error;
    }

    if (data && data.length > 0 && data[0].order_number) {
      const lastNumStr = data[0].order_number.replace(prefix, "");
      const lastSeq = parseInt(lastNumStr, 10);
      if (!isNaN(lastSeq) && lastSeq > 0) {
        const nextSeq = lastSeq + 1;
        return `${prefix}${String(nextSeq).padStart(3, "0")}`;
      }
    }

    // Ayın ilk siparişi
    return `${prefix}001`;
  } catch (err) {
    console.error("generateOrderNumber exception:", err);
    throw new Error("Sipariş numarası üretilemedi.");
  }
}
