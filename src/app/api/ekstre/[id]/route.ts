import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyApiAuth } from "@/lib/security/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter";
import { signSlipToken, verifyAccountToken } from "@/lib/security/linkToken";
import { LEDGER_SELECT, mapLedger, type LedgerRow } from "@/lib/cari/ledger";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";

const notFound = () => NextResponse.json({ error: "Ekstre bulunamadı" }, { status: 404 });

/** Müşteri ekstresi: imzalı link (`?t=`) ya da admin oturumu. Hareketler yeniden eskiye. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || id.length > 80) return notFound();

    const limit = await checkRateLimit(`ekstre_get_${getClientIp(req)}`, 30, 60000);
    if (!limit.allowed) {
      return NextResponse.json({ error: `Çok fazla istek. ${limit.retryAfterSeconds} sn sonra deneyin.` }, { status: 429 });
    }

    const token = new URL(req.url).searchParams.get("t");
    if (!verifyAccountToken(id, token) && !(await verifyApiAuth(req)).isAdmin) return notFound();

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

    const { data: acc, error: accErr } = await supabase
      .from("current_accounts")
      .select("id, name, contact_person, phone, tax_id, balance")
      .eq("id", id)
      .maybeSingle();
    if (accErr) throw accErr;
    if (!acc) return notFound();
    const a = acc as { id: string; name: string | null; contact_person: string | null; phone: string | null; tax_id: string | null; balance: number | string | null };

    const { data: rows, error: txErr } = await supabase
      .from("account_transactions")
      .select(LEDGER_SELECT)
      .eq("account_id", id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (txErr) throw txErr;

    const transactions = mapLedger((rows ?? []) as LedgerRow[]).map((tx) => ({
      ...tx,
      slipToken: signSlipToken(tx.id),
    }));

    return NextResponse.json(
      {
        cari: {
          id: a.id,
          businessName: a.name || "Değerli Müşterimiz",
          contactPerson: a.contact_person || "",
          phone: a.phone || "",
          taxNumber: a.tax_id || "",
          balance: Number(a.balance) || 0,
        },
        transactions,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err: unknown) {
    logError("GET /api/ekstre/[id]:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
