"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, User } from "lucide-react";
import { useCartStore } from "@/lib/store/useCartStore";
import { useAuth } from "@/components/auth/AuthProvider";

/** Ana sayfa üst çubuğu (Atölye Kremi): logo, bölüm bağlantıları, hesap ve sepet. */
export function HomeHeader() {
  const storedCount = useCartStore((s) => s.getItemCount());
  const openCart = useCartStore((s) => s.openCart);
  // Sepet localStorage'dan gelir; sunucu çıktısıyla uyuşması için ilk render'da 0
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const count = mounted ? storedCount : 0;

  const { isLoggedIn, profile, openAuthModal } = useAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

  return (
    <header className="sticky top-0 z-40 border-b border-krem-line bg-krem-paper/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="EkmekLab ana sayfa">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/logo_512.png" alt="" width={40} height={40} className="w-10 h-10" />
          <span className="font-serif text-xl font-semibold tracking-tight text-krem-ink">EkmekLab</span>
        </Link>

        <nav aria-label="Ana sayfa bölümleri" className="hidden md:flex items-center gap-6 text-sm text-krem-ink">
          <a href="#ekmekler" className="hover:text-krem-accent-ink">Ekmekler</a>
          <a href="#laboratuvar" className="hover:text-krem-accent-ink">Laboratuvar</a>
          <Link href="/kutuphane" className="hover:text-krem-accent-ink">Kütüphane</Link>
          <a href="#sss" className="hover:text-krem-accent-ink">Sık sorulanlar</a>
        </nav>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden sm:inline-flex h-10 items-center px-3 rounded-full text-sm font-medium text-krem-ink border border-krem-line hover:border-krem-ink"
            >
              Panel
            </Link>
          )}
          {isLoggedIn ? (
            <Link
              href="/hesabim/siparisler"
              aria-label="Hesabım ve siparişlerim"
              className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 px-3 rounded-full text-sm font-medium text-krem-ink border border-krem-line hover:border-krem-ink"
            >
              <User className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Hesabım</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              aria-label="Giriş yap"
              className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 px-3 rounded-full text-sm font-medium text-krem-ink border border-krem-line hover:border-krem-ink"
            >
              <User className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Giriş</span>
            </button>
          )}
          <button
            type="button"
            onClick={openCart}
            aria-label={`Sepet, ${count} ürün`}
            className="inline-flex h-10 items-center gap-2 px-4 rounded-full text-sm font-semibold text-white bg-krem-ink hover:bg-[#2A1512]"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sepet</span>
            <span className="tabular-nums">{count}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
