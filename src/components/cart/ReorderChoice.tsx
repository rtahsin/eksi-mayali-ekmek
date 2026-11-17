"use client";

import { storefrontAction } from "@/lib/design/storefront";
import { Modal } from "@/components/common/Modal";
import { useCartStore } from "@/lib/store/useCartStore";

export function ReorderChoice() {
  const pending = useCartStore((state) => state.pendingReorder);
  const confirm = useCartStore((state) => state.confirmReorder);
  const cancel = useCartStore((state) => state.cancelReorder);
  if (!pending) return null;
  return <Modal open onClose={cancel} labelledBy="reorder-choice-title"
    className="sf-dialog w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl bg-cream-surface">
    <div className="sf-dialog-body space-y-4">
      <h2 id="reorder-choice-title" className="sf-dialog-title font-serif text-xl font-bold">Sepetinde ürünler var</h2>
      <p className="sf-copy text-sm text-ink-muted">Geçmiş siparişindeki {pending.items.length} çeşit ürünü mevcut sepetine ekleyebilir veya sepeti bu ürünlerle değiştirebilirsin.</p>
      {pending.unavailableNames.length > 0 && <p className="sf-copy text-sm text-ink-muted">Şu an satışta olmayan ürünler eklenmeyecek: {pending.unavailableNames.join(", ")}.</p>}
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => confirm("append")} className={storefrontAction({ variant: "primary", size: "default", className: "" })}>Mevcut sepete ekle</button>
        <button type="button" onClick={() => confirm("replace")} className={storefrontAction({ variant: "secondary", size: "default", className: "" })}>Sepeti bu siparişle değiştir</button>
        <button type="button" onClick={cancel} className={storefrontAction({ variant: "secondary", size: "default", className: "" })}>Vazgeç</button>
      </div>
    </div>
  </Modal>;
}
