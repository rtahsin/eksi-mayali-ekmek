import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tasarım taslakları", robots: { index: false, follow: false } };

const DIRECTIONS = [
  {
    slug: "krem",
    name: "1 · Atölye Kremi",
    note: "Açık, kâğıt hissi. Logonun kreminden ve bordo mürekkebinden çıkıyor. Sıcak, el yapımı, fırın menüsü gibi.",
    swatch: ["#F6EEDF", "#3B1E1A", "#B4532A"],
  },
  {
    slug: "gece",
    name: "2 · Gece Fırını",
    note: "Bugünkü koyu temanın toparlanmış hâli. Fotoğraf öne çıkar, buğday altını vurgu. Premium, akşam ışığı.",
    swatch: ["#14100D", "#EFE6D8", "#D9A05B"],
  },
  {
    slug: "tezgah",
    name: "3 · Mahalle Tezgâhı",
    note: "Sade, modern, liste gibi okunur. Büyük yazı, az süs; fiyat ve gün bilgisi net. Hızlı sipariş için.",
    swatch: ["#EFEBE4", "#1A1A1A", "#C85A32"],
  },
];

export default function DraftIndex() {
  return (
    <div className="min-h-screen bg-[#F6EEDF] text-[#2A1B17] px-5 py-10" style={{ fontFamily: "var(--font-inter)" }}>
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
            Ana sayfa için 3 yön
          </h1>
          <p className="text-sm text-[#6B5A52] mt-2">
            Hepsi aynı içerik ve gerçek ürünlerinle; yalnız görünüş farklı. Telefonda aç, kaydır, hangisinde &quot;bu
            benim fırınım&quot; dediğini söyle. Fotoğraflar sonra senin gerçek fotoğraflarınla değişecek.
          </p>
        </div>
        {DIRECTIONS.map((d) => (
          <Link
            key={d.slug}
            href={`/tasarim/${d.slug}`}
            className="block rounded-2xl border border-[#DCCBB4] bg-white/60 p-5 hover:border-[#B4532A] transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-bold">{d.name}</span>
              <span className="flex gap-1.5">
                {d.swatch.map((c) => (
                  <span key={c} className="w-6 h-6 rounded-full border border-black/10" style={{ background: c }} />
                ))}
              </span>
            </div>
            <p className="text-sm text-[#6B5A52] mt-2">{d.note}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
