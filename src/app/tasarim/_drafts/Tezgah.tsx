import Link from "next/link";
import type { Product } from "@/types";
import { CONTACT, whatsappLink } from "@/lib/site";
import { productBadges } from "@/lib/products/badges";
import { tl, weightLabel, type DraftData } from "../data";

/** Yön 3 · Mahalle Tezgâhı — sade, modern, menü listesi gibi okunur; büyük yazı, az süs. */
const C = {
  bg: "#EFEBE4",
  white: "#FAF8F4",
  ink: "#1A1A1A",
  soft: "#6B6660",
  line: "#D9D3C9",
  accent: "#C85A32",
};
const mono = { fontFamily: "var(--font-jetbrains-mono)" } as const;

/** Admin kurallarından ilk rozet (ön sipariş, belirli gün, kampanya…) */
function badge(p: Product): string | null {
  return productBadges(p)[0]?.label ?? null;
}

/** Menü satırı: küçük fotoğraf, ad, gramaj, noktalı çizgi, fiyat, ekle */
function MenuRow({ p }: { p: Product }) {
  return (
    <li className="flex items-center gap-4 py-4 border-b" style={{ borderColor: C.line }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.imageUrl || "/images/products/koy-ekmegi.jpg"} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="font-semibold text-[16px] leading-snug">{p.name}</h3>
        </div>
        <div className="text-xs mt-0.5 flex gap-2" style={{ ...mono, color: C.soft }}>
          <span>{weightLabel(p)}</span>
          {badge(p) && <span style={{ color: C.accent }}>{badge(p)?.toLocaleUpperCase("tr-TR")}</span>}
        </div>
      </div>
      <span className="font-semibold shrink-0" style={mono}>
        {tl(p.price)}
      </span>
      <span
        className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
        style={{ background: C.ink, color: C.white }}
        aria-label="Sepete ekle"
      >
        +
      </span>
    </li>
  );
}

export function TezgahDraft({ data }: { data: DraftData }) {
  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.ink, fontFamily: "var(--font-inter)" }}>
      <header className="sticky top-0 z-20 border-b" style={{ background: C.bg, borderColor: C.line }}>
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/tasarim" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo.png" alt="EkmekLab" className="w-8 h-8" />
            <span className="font-bold tracking-tight">EkmekLab</span>
          </Link>
          <span className="text-sm font-semibold" style={mono}>
            SEPET (0)
          </span>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-5 pt-12 pb-10 space-y-6">
        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
          style={{ ...mono, background: C.white, border: `1px solid ${C.line}` }}
        >
          BEYLİKDÜZÜ · EKŞİ MAYALI TAŞ FIRIN
        </span>
        <h1 className="text-[46px] sm:text-[80px] leading-[0.98] font-black tracking-tight">
          Ekşi mayalı ekmek.
          <br />
          <span style={{ color: C.accent }}>Siparişe göre pişer.</span>
        </h1>
        <p className="text-lg max-w-xl" style={{ color: C.soft }}>
          Taş değirmen unu, canlı ekşi maya. Sen günü seç; fırından çıktığı gün kapına getirelim.
        </p>
        <div className="grid sm:grid-cols-3 gap-px rounded-2xl overflow-hidden border" style={{ background: C.line, borderColor: C.line }}>
          {[
            ["TESLİMAT", "Beylikdüzü geneli"],
            ["ÜCRET", `${tl(data.freeShippingThreshold)} üzeri ücretsiz`],
            ["ÖDEME", "Kapıda nakit / kart"],
          ].map(([k, v]) => (
            <div key={k} className="px-4 py-3" style={{ background: C.white }}>
              <div className="text-[11px]" style={{ ...mono, color: C.soft }}>
                {k}
              </div>
              <div className="font-semibold">{v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-5 pb-14 grid md:grid-cols-2 gap-x-12">
        <div>
          <h2 className="text-sm font-bold pt-6 pb-2 border-b-2" style={{ ...mono, borderColor: C.ink }}>
            EKMEKLER · {data.breads.length}
          </h2>
          <ul>
            {data.breads.map((p) => (
              <MenuRow key={p.id} p={p} />
            ))}
          </ul>
        </div>
        {data.extras.length > 0 && (
          <div>
            <h2 className="text-sm font-bold pt-6 pb-2 border-b-2" style={{ ...mono, borderColor: C.ink }}>
              EKMEĞİN YANINA · {data.extras.length}
            </h2>
            <ul>
              {data.extras.map((p) => (
                <MenuRow key={p.id} p={p} />
              ))}
            </ul>
          </div>
        )}
      </section>

      <section style={{ background: C.ink, color: C.white }}>
        <div className="max-w-5xl mx-auto px-5 py-14 grid md:grid-cols-3 gap-8">
          {[
            ["Günü seç", "Sepetini doldur, teslim gününü seç. Hesap açman gerekmez."],
            ["Siparişine göre pişer", "Hamur gelen siparişe göre yoğrulur; rafta bekleyen ekmek yok."],
            ["Kapına gelir", "Beylikdüzü içinde kendimiz getiriyoruz; ödemeyi kapıda yaparsın."],
          ].map(([t, d], i) => (
            <div key={t} className="space-y-2">
              <span className="text-xs" style={{ ...mono, color: C.accent }}>
                ADIM {i + 1}
              </span>
              <h3 className="text-2xl font-bold">{t}</h3>
              <p className="opacity-70 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-5 py-14">
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight max-w-3xl">Un, su, tuz, ekşi maya. Ve zaman.</h2>
        <p className="text-lg mt-4 max-w-2xl" style={{ color: C.soft }}>
          Karakılçık, siyez, kavılca gibi eski buğdaylardan taş değirmende öğütülmüş unlar; uzun mayalanma, taş tabanda
          pişirme.
        </p>
      </section>

      <footer className="border-t" style={{ borderColor: C.line }}>
        <div className="max-w-5xl mx-auto px-5 py-8 flex flex-wrap gap-x-6 gap-y-2 text-sm" style={{ ...mono, color: C.soft }}>
          <span>EKMEKLAB · BEYLİKDÜZÜ</span>
          <a href={`tel:+${CONTACT.phoneE164}`}>{CONTACT.phoneDisplay}</a>
          <a href={whatsappLink()}>WHATSAPP</a>
          <a href="https://www.instagram.com/ekmeklabtr">@EKMEKLABTR</a>
        </div>
      </footer>
    </div>
  );
}
