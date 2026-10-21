import { KANIT_ETIKETI, cumleEtiketi, splitCumleler, type AtifKarti } from "@/lib/bilim";
import s from "./bilim.module.css";

// [[…]] atıflı metni cümle cümle yazar; atıflı cümlenin sonuna kanıt etiketi düğmesi koyar.
// Düğme yalnız data-atif taşır; tıklamayı sayfadaki KaynakPaneli yakalar.

export function Metin({ metin, kartlar }: { metin: string; kartlar: Record<string, AtifKarti> }) {
  return (
    <>
      {splitCumleler(metin).map((c, i) => {
        const ids = c.atiflar.filter((id) => kartlar[id]);
        const durum = cumleEtiketi(ids.map((id) => kartlar[id].durum));
        return (
          <span key={i}>
            {i > 0 && " "}
            {c.govde}
            {durum && (
              <button
                type="button"
                className={`${s.etiket} ${durum === "tartismali" ? s.celisiyor : ""}`}
                data-atif={ids.join(" ")}
                aria-haspopup="dialog"
                aria-label={`Kaynak: ${KANIT_ETIKETI[durum]}`}
              >
                {KANIT_ETIKETI[durum]}
              </button>
            )}
          </span>
        );
      })}
    </>
  );
}
