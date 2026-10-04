"use client";

import { getShareUrl, type ShareTarget } from "@/hooks/useCariler";

function waNumber(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("90")) return d;
  if (d.startsWith("0")) return `9${d}`;
  return `90${d}`;
}

/**
 * İmzalı ekstre/fiş linkini alıp WhatsApp'ı açar. Pencere tıklama anında açılır
 * (açılır pencere engelleyicisi), link gelince yönlendirilir.
 */
export async function shareViaWhatsApp(
  phone: string,
  target: ShareTarget,
  buildText: (url: string) => string
): Promise<boolean> {
  const win = typeof window !== "undefined" ? window.open("", "_blank") : null;
  const url = await getShareUrl(target);
  if (!url) {
    win?.close();
    alert("Paylaşım linki oluşturulamadı. Lütfen tekrar deneyin.");
    return false;
  }
  const href = `https://wa.me/${phone ? waNumber(phone) : ""}?text=${encodeURIComponent(buildText(url))}`;
  if (win) win.location.href = href;
  else window.location.href = href;
  return true;
}

export const ekstreMessage = (businessName: string, balance: number) => (url: string) =>
  `🍞 *EKMEKLAB TAŞ FIRIN - CARİ HESAP EKSTRESİ*\nSayın *${businessName}*,\n\n📊 *Güncel Bakiye:* ${balance.toLocaleString("tr-TR")} ₺\n🔗 *Ekstre linkiniz:* ${url}\n\nTüm teslimat fişlerinizi ve ödemelerinizi bu bağlantıdan inceleyebilirsiniz.\nEkmekLab`;
