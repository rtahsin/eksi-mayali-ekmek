"use client";

import { storefrontAction } from "@/lib/design/storefront";
import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { useCartStore } from "@/lib/store/useCartStore";

/** Non-blocking desktop feedback; mobile keeps its existing cart summary bar. */
export function CartFeedback() {
  const notice = useCartStore((state) => state.notice);
  const dismiss = useCartStore((state) => state.dismissNotice);
  const openCart = useCartStore((state) => state.openCart);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notice) return;
    ref.current?.showPopover?.();
    const timer = setTimeout(dismiss, 4500);
    return () => clearTimeout(timer);
  }, [notice, dismiss]);

  if (!notice) return null;
  return <div ref={ref} popover="manual" role="status" aria-live="polite"
    className="sf-panel hidden md:block fixed inset-auto bottom-6 right-6 m-0 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-cream-surface p-4 text-ink shadow-lg">
    <div className="flex items-start gap-3">
      <Check aria-hidden="true" className="w-5 h-5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="sf-copy text-sm font-semibold">{notice.quantity} adet sepete eklendi</p>
        <p className="sf-copy text-xs text-ink-muted break-words">{notice.name}</p>
        <button type="button" onClick={openCart} className={storefrontAction({ variant: "primary", size: "default", className: "" })}>Sepeti aç</button>
      </div>
      <button type="button" onClick={dismiss} aria-label="Sepet bildirimini kapat" className={storefrontAction({ variant: "secondary", size: "icon", className: "" })}><X aria-hidden="true" className="w-4 h-4 mx-auto" /></button>
    </div>
  </div>;
}
