"use client";

import { useStoreSettings } from "@/hooks/useStoreSettings";

const tl = (v: number) => `${v.toLocaleString("tr-TR")} ₺`;

/** Teslimat ücreti kuralı, admin ayarlarından (sabit metin yok). */
export function ShippingPolicyNote({ className }: { className?: string }) {
  const { settings } = useStoreSettings();
  const { shippingFee, freeShippingThreshold, minBasketAmount } = settings;

  let text: string;
  if (shippingFee === 0) text = "Teslimat ücretsiz";
  else if (freeShippingThreshold > 0) text = `${tl(freeShippingThreshold)} üzeri teslimat ücretsiz · altında ${tl(shippingFee)}`;
  else text = `Teslimat ücreti ${tl(shippingFee)}`;
  if (minBasketAmount > 0) text += ` · minimum sipariş ${tl(minBasketAmount)}`;

  return <span className={className}>{text}</span>;
}
