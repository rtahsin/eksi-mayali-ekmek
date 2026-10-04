import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/apiAuth";
import { signAccountToken, signOrderToken, signSlipToken } from "@/lib/security/linkToken";
import { SITE_URL } from "@/lib/site";

/**
 * Müşteriye gönderilecek imzalı link: `?accountId=` → ekstre, `?transactionId=` → tek fiş/makbuz,
 * `?orderId=` → sipariş teslimat fişi (sipariş takip token'ı ile).
 * İmzasız /ekstre ve /fis linkleri müşteriye veri göstermez.
 */
export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const accountId = url.searchParams.get("accountId");
  const transactionId = url.searchParams.get("transactionId");
  const orderId = url.searchParams.get("orderId");

  if (accountId && /^[A-Za-z0-9_-]{1,80}$/.test(accountId)) {
    const token = signAccountToken(accountId);
    if (!token) return NextResponse.json({ error: "İmza anahtarı yok" }, { status: 500 });
    return NextResponse.json({ url: `${SITE_URL}/ekstre/${encodeURIComponent(accountId)}?t=${token}` });
  }
  if (transactionId && /^[0-9a-f-]{36}$/i.test(transactionId)) {
    const token = signSlipToken(transactionId);
    if (!token) return NextResponse.json({ error: "İmza anahtarı yok" }, { status: 500 });
    return NextResponse.json({ url: `${SITE_URL}/fis/${transactionId}?t=${token}` });
  }
  if (orderId && /^[A-Za-z0-9_-]{1,64}$/.test(orderId)) {
    const token = signOrderToken(orderId);
    if (!token) return NextResponse.json({ error: "İmza anahtarı yok" }, { status: 500 });
    return NextResponse.json({ url: `${SITE_URL}/fis/${orderId}?t=${token}` });
  }
  return NextResponse.json({ error: "accountId, transactionId veya orderId gerekli" }, { status: 400 });
}
