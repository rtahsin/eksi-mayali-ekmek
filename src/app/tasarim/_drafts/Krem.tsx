import Link from "next/link";
import type { Product } from "@/types";
import { CONTACT, whatsappLink } from "@/lib/site";
import { productBadges } from "@/lib/products/badges";
import { tl, weightLabel, type DraftData } from "../data";

/** Yön 1 · Atölye Kremi — logonun kremi ve bordo mürekkebi; kâğıt menü hissi. */
const C = {
  paper: "#F6EEDF",
  card: "#FBF6EC",
  ink: "#3B1E1A",
  soft: "#6E5148",
  line: "#E2D3BD",
  accent: "#B4532A",
};
const serif = { fontFamily: "var(--font-fraunces)" } as const;

/** Admin kurallarından ilk rozet (ön sipariş, belirli gün, kampanya…) */
function badge(p: Product): string | null {
  return productBadges(p)[0]?.label ?? null;
}

function ProductCard({ p }: { p: Product }) {
  return (
    <div className="group">
      <div className="aspect-[4/5] overflow-hidden rounded-[18px] border" style={{ borderColor: C.line, background: C.card }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.imageUrl || "/images/products/koy-ekmegi.jpg"} alt={p.name} className="w-full h-full object-cover" />
      </div>
      <div className="pt-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] leading-snug font-semibold" style={serif}>
            {p.name}
          </h3>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: C.soft }}>
            {weightLabel(p)}
            {badge(p) && (
              <span className="ml-2 text-xs uppercase tracking-wider" style={{ color: C.accent }}>
                {badge(p)}
              </span>
            )}
          </span>
          <span className="font-semibold">
            {p.compareAtPrice ? (
              <span className="line-through mr-1.5 font-normal" style={{ color: C.soft }}>
                {tl(p.compareAtPrice)}
              </span>
            ) : null}
            {tl(p.price)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function KremDraft({ data }: { data: DraftData }) {
  const hero = data.breads[0];
  return (
    <div className="min-h-screen" style={{ background: C.paper, color: C.ink, fontFamily: "var(--font-inter)" }}>
      {/* Üst çubuk */}
      <header className="sticky top-0 z-20 border-b backdrop-blur" style={{ borderColor: C.line, background: `${C.paper}EE` }}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/tasarim" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo.png" alt="EkmekLab" className="w-10 h-10" />
            <span className="text-xl font-bold tracking-tight" style={serif}>
              EkmekLab
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <a href="#ekmekler" className="hidden sm:inline">Ekmekler</a>
            <a href="#nasil" className="hidden sm:inline">Nasıl çalışır</a>
            <span className="px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ background: C.ink }}>
              Sepet · 0
            </span>
          </nav>
        </div>
      </header>

      {/* Karşılama */}
      <section className="max-w-6xl mx-auto px-5 pt-10 pb-12 grid md:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: C.accent }}>
            Beylikdüzü · ekşi mayalı taş fırın
          </p>
          <h1 className="text-[42px] sm:text-6xl leading-[1.05] font-semibold" style={serif}>
            Siparişe göre pişen <em className="italic" style={{ color: C.accent }}>ekşi mayalı</em> ekmek.
          </h1>
          <p className="text-[17px] leading-relaxed max-w-md" style={{ color: C.soft }}>
            Taş değirmen unu, canlı ekşi maya, acele etmeden. Sen günü seç; fırından çıktığı gün kapına getirelim.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#ekmekler" className="px-6 py-3.5 rounded-full text-white font-semibold" style={{ background: C.accent }}>
              Ekmek seç
            </a>
            <a href="#nasil" className="px-6 py-3.5 rounded-full font-semibold border" style={{ borderColor: C.ink }}>
              Nasıl çalışır?
            </a>
          </div>
        </div>
        {hero && (
          <div className="relative">
            <div className="aspect-[4/5] rounded-[28px] overflow-hidden border" style={{ borderColor: C.line }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero.imageUrl} alt={hero.name} className="w-full h-full object-cover" />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo.png" alt="" className="absolute -bottom-6 -left-4 w-24 h-24 rotate-[-8deg] drop-shadow" />
          </div>
        )}
      </section>

      {/* Teslimat şeridi */}
      <div className="border-y" style={{ borderColor: C.line, background: C.card }}>
        <div className="max-w-6xl mx-auto px-5 py-4 flex flex-wrap gap-x-8 gap-y-2 text-sm" style={{ color: C.soft }}>
          <span>Beylikdüzü&apos;ne kendi teslimatımız</span>
          <span>
            {tl(data.freeShippingThreshold)} üzeri teslimat ücretsiz (altında {tl(data.shippingFee)})
          </span>
          <span>Kapıda nakit ya da kart</span>
        </div>
      </div>

      {/* Ekmekler */}
      <section id="ekmekler" className="max-w-6xl mx-auto px-5 py-14 space-y-8">
        <div className="flex items-end justify-between gap-4 border-b pb-4" style={{ borderColor: C.line }}>
          <h2 className="text-3xl sm:text-4xl font-semibold" style={serif}>
            Ekmekler
          </h2>
          <span className="text-sm" style={{ color: C.soft }}>
            {data.breads.length} çeşit
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8">
          {data.breads.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>

        {data.extras.length > 0 && (
          <div className="pt-8 space-y-6">
            <h3 className="text-2xl font-semibold" style={serif}>
              Ekmeğin yanına
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8">
              {data.extras.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Nasıl çalışır */}
      <section id="nasil" className="border-t" style={{ borderColor: C.line, background: C.card }}>
        <div className="max-w-6xl mx-auto px-5 py-14 grid md:grid-cols-3 gap-8">
          {[
            ["Günü seç", "Sepetini doldur, teslim gününü seç. Hesap açman gerekmez."],
            ["Siparişine göre pişer", "Hamur gelen siparişe göre yoğrulur; rafta bekleyen ekmek yok."],
            ["Kapına gelir", "Beylikdüzü içinde kendimiz getiriyoruz; ödemeyi kapıda yaparsın."],
          ].map(([t, d], i) => (
            <div key={t} className="space-y-2">
              <span className="text-5xl font-semibold" style={{ ...serif, color: C.accent }}>
                {i + 1}
              </span>
              <h3 className="text-xl font-semibold" style={serif}>
                {t}
              </h3>
              <p className="text-[15px] leading-relaxed" style={{ color: C.soft }}>
                {d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Zanaat */}
      <section className="max-w-3xl mx-auto px-5 py-16 text-center space-y-5">
        <h2 className="text-3xl sm:text-4xl font-semibold leading-tight" style={serif}>
          Temelinde un, su, tuz ve ekşi maya.
        </h2>
        <p className="text-[17px] leading-relaxed" style={{ color: C.soft }}>
          Karakılçık, siyez, kavılca gibi eski buğdaylardan taş değirmende öğütülmüş unlar. Uzun mayalanma, taş tabanda
          pişirme. Gerisi sabır.
        </p>
      </section>

      {/* Alt bilgi */}
      <footer className="border-t" style={{ borderColor: C.line }}>
        <div className="max-w-6xl mx-auto px-5 py-10 grid sm:grid-cols-3 gap-6 text-sm" style={{ color: C.soft }}>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo.png" alt="" className="w-12 h-12" />
            <div>
              <div className="font-semibold" style={{ ...serif, color: C.ink }}>
                EkmekLab
              </div>
              Beylikdüzü, İstanbul
            </div>
          </div>
          <div className="space-y-1">
            <a href={`tel:+${CONTACT.phoneE164}`} className="block">{CONTACT.phoneDisplay}</a>
            <a href={whatsappLink()} className="block">WhatsApp ile yaz</a>
            <a href="https://www.instagram.com/ekmeklabtr" className="block">@ekmeklabtr</a>
          </div>
          <div className="space-y-1">
            <span className="block">Siparişlerim</span>
            <span className="block">KVKK · Mesafeli satış</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
