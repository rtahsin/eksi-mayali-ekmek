import Link from "next/link";
import type { Product } from "@/types";
import { CONTACT, whatsappLink } from "@/lib/site";
import { productBadges } from "@/lib/products/badges";
import { tl, weightLabel, type DraftData } from "../data";

/** Yön 2 · Gece Fırını — bugünkü koyu temanın toparlanmış hâli; fotoğraf önde, buğday altını vurgu. */
const C = {
  bg: "#14100D",
  card: "#1D1713",
  line: "#2E251F",
  text: "#EFE6D8",
  soft: "#A8998A",
  gold: "#D9A05B",
};
const serif = { fontFamily: "var(--font-fraunces)" } as const;

/** Admin kurallarından ilk rozet (ön sipariş, belirli gün, kampanya…) */
function badge(p: Product): string | null {
  return productBadges(p)[0]?.label ?? null;
}

function ProductCard({ p }: { p: Product }) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ background: C.card, borderColor: C.line }}>
      <div className="relative aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.imageUrl || "/images/products/koy-ekmegi.jpg"} alt={p.name} className="w-full h-full object-cover" />
        {badge(p) && (
          <span
            className="absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
            style={{ background: `${C.bg}CC`, color: C.gold }}
          >
            {badge(p)}
          </span>
        )}
      </div>
      <div className="p-3.5 space-y-2">
        <h3 className="text-[15px] leading-snug" style={serif}>
          {p.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: C.soft }}>
            {weightLabel(p)}
          </span>
          <span className="font-semibold" style={{ color: C.gold }}>
            {tl(p.price)}
          </span>
        </div>
        <span
          className="block text-center py-2 rounded-lg text-sm font-semibold border"
          style={{ borderColor: C.gold, color: C.gold }}
        >
          Sepete ekle
        </span>
      </div>
    </div>
  );
}

export function GeceDraft({ data }: { data: DraftData }) {
  const hero = data.breads[0];
  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text, fontFamily: "var(--font-inter)" }}>
      <header className="absolute top-0 inset-x-0 z-20">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/tasarim" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo.png" alt="EkmekLab" className="w-10 h-10" />
            <span className="text-lg font-semibold tracking-wide" style={serif}>
              EkmekLab
            </span>
          </Link>
          <span className="px-4 py-2 rounded-full text-sm font-semibold" style={{ background: C.gold, color: C.bg }}>
            Sepet · 0
          </span>
        </div>
      </header>

      {/* Tam boy fotoğraflı karşılama */}
      <section className="relative min-h-[88vh] flex items-end">
        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${C.bg} 8%, ${C.bg}B3 45%, ${C.bg}33 100%)` }} />
        <div className="relative max-w-6xl mx-auto w-full px-5 pb-14 space-y-5">
          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: C.gold }}>
            Beylikdüzü · ekşi mayalı taş fırın
          </p>
          <h1 className="text-[44px] sm:text-7xl leading-[1.02] max-w-3xl" style={serif}>
            Siparişe göre pişen ekşi mayalı ekmek.
          </h1>
          <p className="text-[17px] leading-relaxed max-w-lg" style={{ color: C.soft }}>
            Taş değirmen unu, canlı ekşi maya, acele etmeden. Sen günü seç; fırından çıktığı gün kapına getirelim.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <a href="#ekmekler" className="px-7 py-3.5 rounded-full font-semibold" style={{ background: C.gold, color: C.bg }}>
              Ekmek seç
            </a>
            <a href="#nasil" className="px-7 py-3.5 rounded-full font-semibold border" style={{ borderColor: C.line }}>
              Nasıl çalışır?
            </a>
          </div>
        </div>
      </section>

      {/* Teslimat bilgisi */}
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          {[
            ["Teslimat", "Beylikdüzü'ne kendi teslimatımız"],
            ["Ücret", `${tl(data.freeShippingThreshold)} üzeri ücretsiz · altında ${tl(data.shippingFee)}`],
            ["Ödeme", "Kapıda nakit ya da kart"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border px-4 py-3" style={{ borderColor: C.line, background: C.card }}>
              <div className="text-[11px] uppercase tracking-wider" style={{ color: C.gold }}>
                {k}
              </div>
              <div style={{ color: C.text }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <section id="ekmekler" className="max-w-6xl mx-auto px-5 py-14 space-y-6">
        <h2 className="text-3xl sm:text-4xl" style={serif}>
          Fırından
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {data.breads.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
        {data.extras.length > 0 && (
          <>
            <h2 className="text-2xl pt-8" style={serif}>
              Ekmeğin yanına
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {data.extras.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          </>
        )}
      </section>

      <section id="nasil" className="border-y" style={{ borderColor: C.line, background: C.card }}>
        <div className="max-w-6xl mx-auto px-5 py-14 grid md:grid-cols-3 gap-8">
          {[
            ["Günü seç", "Sepetini doldur, teslim gününü seç. Hesap açman gerekmez."],
            ["Siparişine göre pişer", "Hamur gelen siparişe göre yoğrulur; rafta bekleyen ekmek yok."],
            ["Kapına gelir", "Beylikdüzü içinde kendimiz getiriyoruz; ödemeyi kapıda yaparsın."],
          ].map(([t, d], i) => (
            <div key={t} className="space-y-2">
              <span className="text-sm font-mono" style={{ color: C.gold }}>
                0{i + 1}
              </span>
              <h3 className="text-xl" style={serif}>
                {t}
              </h3>
              <p className="text-[15px] leading-relaxed" style={{ color: C.soft }}>
                {d}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-5 py-16 space-y-4">
        <h2 className="text-3xl sm:text-4xl leading-tight" style={serif}>
          Temelinde un, su, tuz ve ekşi maya.
        </h2>
        <p className="text-[17px] leading-relaxed" style={{ color: C.soft }}>
          Karakılçık, siyez, kavılca gibi eski buğdaylardan taş değirmende öğütülmüş unlar. Uzun mayalanma, taş tabanda
          pişirme. Gerisi sabır.
        </p>
      </section>

      <footer className="border-t" style={{ borderColor: C.line }}>
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row gap-6 justify-between text-sm" style={{ color: C.soft }}>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo.png" alt="" className="w-12 h-12" />
            <span>EkmekLab · Beylikdüzü, İstanbul</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <a href={`tel:+${CONTACT.phoneE164}`}>{CONTACT.phoneDisplay}</a>
            <a href={whatsappLink()}>WhatsApp</a>
            <a href="https://www.instagram.com/ekmeklabtr">@ekmeklabtr</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
