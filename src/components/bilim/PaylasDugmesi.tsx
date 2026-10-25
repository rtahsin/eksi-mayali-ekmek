"use client";

import { useState } from "react";

// Efsane dosyasında tek bir inancın bağlantısı: telefonda paylaşma menüsü, yoksa panoya kopyalama.
export function PaylasDugmesi({ yer, baslik, sinif }: { yer: string; baslik: string; sinif: string }) {
  const [kopyalandi, setKopyalandi] = useState(false);

  async function paylas() {
    const url = `${location.origin}${location.pathname}#${yer}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: baslik, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      // okur paylaşmaktan vazgeçti ya da pano izni yok
    }
  }

  return (
    <button type="button" className={sinif} onClick={paylas}>
      <span aria-live="polite">{kopyalandi ? "Bağlantı kopyalandı" : "Bağlantıyı paylaş"}</span>
    </button>
  );
}
