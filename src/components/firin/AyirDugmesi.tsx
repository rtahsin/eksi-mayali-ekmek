"use client";

import { useState } from "react";
import type { ExtendedProduct } from "@/types";
import { useCartStore } from "@/lib/store/useCartStore";
import s from "./firin.module.css";

// Ayır: ürünü sepete koyar ve sepeti açar. Gün, teslimat ve ödeme mevcut sepet akışında seçilir;
// sipariş yine yalnız /api/orders/create → create_order_atomic ile oluşur.

export function AyirDugmesi({ urun, acik }: { urun: ExtendedProduct; acik: boolean }) {
  const addItem = useCartStore((st) => st.addItem);
  const openCart = useCartStore((st) => st.openCart);
  const [ayrildi, setAyrildi] = useState(false);

  return (
    <>
      <button
        type="button"
        className={s.ayir}
        disabled={!acik}
        onClick={() => {
          if (addItem(urun, null, 1)) {
            setAyrildi(true);
            openCart();
          }
        }}
        aria-label={`${urun.name} ayır`}
      >
        Ayır
      </button>
      <p className={s.ayirOnay} aria-live="polite">
        {ayrildi ? "Ayrılanlara eklendi; gününü sepette seçersin." : ""}
      </p>
    </>
  );
}
