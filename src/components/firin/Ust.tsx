"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/store/useCartStore";
import s from "./firin.module.css";

// Üst şerit: marka, üç bağlantı ve sepet. Sepet localStorage'dan gelir; sunucu çıktısıyla uyuşsun diye
// ilk çizimde 0 görünür (Navbar ile aynı yol).

export function Ust() {
  const adet = useCartStore((st) => st.getItemCount());
  const openCart = useCartStore((st) => st.openCart);
  const [hazir, setHazir] = useState(false);
  useEffect(() => setHazir(true), []);

  return (
    <header className={s.ust}>
      <div className={`${s.ic} ${s.ustSatir}`}>
        <Link href="/firin" className={s.marka}>
          EkmekLab<small>Beylikdüzü</small>
        </Link>
        <nav className={s.ustBag} aria-label="Fırın">
          <a href="#tezgah">Tezgâh</a>
          <Link href="/bilim" className={s.gizliDar}>
            Bilim odası
          </Link>
          <button type="button" className={s.sepet} onClick={openCart}>
            Ayrılanlar · {hazir ? adet : 0}
          </button>
        </nav>
      </div>
    </header>
  );
}
