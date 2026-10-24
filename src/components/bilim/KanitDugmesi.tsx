import { KANIT_ETIKETI, cumleEtiketi, type AtifKarti } from "@/lib/bilim";
import s from "./bilim.module.css";

// Bir bilgi kümesinin kanıt etiketi; tıklamayı sayfadaki KaynakPaneli yakalar.
export function KanitDugmesi({ ids, kartlar, metin }: { ids: string[]; kartlar: Record<string, AtifKarti>; metin?: string }) {
  const durum = cumleEtiketi(ids.filter((id) => kartlar[id]).map((id) => kartlar[id].durum));
  if (!durum) return null;
  return (
    <button
      type="button"
      className={`${s.etiket} ${durum === "tartismali" ? s.celisiyor : ""}`}
      data-atif={ids.join(" ")}
      aria-haspopup="dialog"
    >
      {metin ?? KANIT_ETIKETI[durum]}
    </button>
  );
}
