import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { StoreSettings } from "@/types/settings";
import { CONTACT, STOCKISTS, YOUTUBE_URL, whatsappLink } from "@/lib/site";
import { toWhatsAppNumber } from "@/lib/settings/schema";
import { deliveryDaysLabel, formatTl, type HomeProductGroups } from "@/lib/products/homeSections";
import { FeaturedProductCard, HomeProductCard } from "./HomeProductCard";

/* ─────────────────────────── ortak parçalar ─────────────────────────── */

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.18em] text-krem-accent-ink">{children}</p>;
}

function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="font-serif text-[32px] sm:text-[44px] leading-[1.08] font-semibold tracking-tight text-krem-ink text-balance">
      {children}
    </h2>
  );
}

/** Teslimat ücreti cümlesi (ayarlardan). */
export function shippingText(s: Pick<StoreSettings, "shippingFee" | "freeShippingThreshold">): string {
  if (s.shippingFee <= 0) return "Teslimat ücretsiz";
  if (s.freeShippingThreshold > 0)
    return `${formatTl(s.freeShippingThreshold)} üzeri ücretsiz, altında ${formatTl(s.shippingFee)}`;
  return `Teslimat ${formatTl(s.shippingFee)}`;
}

function businessWhatsapp(settings: StoreSettings, text?: string): string {
  return whatsappLink(text, toWhatsAppNumber(settings.whatsappPhone || CONTACT.phoneDisplay));
}

/* ─────────────────────────── 1. Açılış ─────────────────────────── */

export function HomeHero({ settings }: { settings: StoreSettings }) {
  const facts: [string, string][] = [
    ["Teslimat", "Beylikdüzü'ne kendimiz getiriyoruz"],
    ["Günler", `${deliveryDaysLabel(settings.openWeekdays)}, ${settings.deliveryWindow}`],
    ["Ücret", shippingText(settings)],
    ["Ödeme", "Kapıda nakit ya da kart"],
  ];

  return (
    <section aria-labelledby="hero-baslik" className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-12 sm:pb-16">
      <div className="grid md:grid-cols-[1.05fr_1fr] gap-10 md:gap-12 items-center">
        <div className="space-y-6 order-2 md:order-1">
          <Eyebrow>Beylikdüzü · ekşi mayalı taş fırın</Eyebrow>
          <h1
            id="hero-baslik"
            className="font-serif text-[44px] sm:text-6xl lg:text-[68px] leading-[1.02] font-semibold tracking-tight text-krem-ink text-balance"
          >
            Mahallenin ekmek laboratuvarı.
          </h1>
          <p className="font-serif italic text-2xl text-krem-accent-ink">İyi ekmek, herkesin sofrasına.</p>
          <p className="text-[17px] leading-relaxed text-krem-soft max-w-md">
            Un, su, tuz ve ekşi maya. Bir ekmek yaklaşık 24 saatte hazır olur. Sen günü seç, fırından çıktığı gün
            kapına getirelim.
          </p>

          {!settings.orderAcceptanceOpen && (
            <p role="status" className="rounded-2xl border border-krem-accent/40 bg-krem-card px-4 py-3 text-sm text-krem-ink">
              Şu an yeni sipariş almıyoruz. Bir sorun olursa{" "}
              <a href={businessWhatsapp(settings)} className="underline underline-offset-2 font-semibold">
                WhatsApp&apos;tan yaz
              </a>
              .
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <a
              href="#ekmekler"
              className="h-12 inline-flex items-center px-7 rounded-full bg-krem-accent text-white text-[15px] font-semibold hover:bg-krem-accent-ink"
            >
              Ekmek seç
            </a>
            <a
              href="#laboratuvar"
              className="h-12 inline-flex items-center px-6 rounded-full border border-krem-ink text-krem-ink text-[15px] font-semibold hover:bg-krem-card"
            >
              Nasıl yapılıyor?
            </a>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2 text-sm border-t border-krem-line max-w-lg">
            {facts.map(([k, v]) => (
              <div key={k} className="pt-3">
                <dt className="text-[11px] uppercase tracking-[0.14em] text-krem-soft">{k}</dt>
                <dd className="mt-0.5 font-medium text-krem-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className="relative order-1 md:order-2 mx-auto w-full max-w-[460px]">
          <div className="aspect-[16/11] sm:aspect-[4/5] overflow-hidden rounded-[28px] border border-krem-line bg-krem-card">
            <Image
              src="/images/products/koy-ekmegi.jpg"
              alt="Taş fırından yeni çıkmış, üstüne kesik atılmış ekşi mayalı köy ekmeği"
              width={848}
              height={1131}
              priority
              sizes="(min-width: 768px) 460px, 100vw"
              className="w-full h-full object-cover"
            />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/logo_512.png"
            alt=""
            width={96}
            height={96}
            className="absolute -bottom-5 -left-3 w-20 h-20 sm:w-24 sm:h-24 rotate-[-8deg] drop-shadow-md"
          />
          <figcaption className="mt-3 text-right text-sm text-krem-soft">Köy ekmeği, bizim fırından.</figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ─────────────────────────── 2. Fırında bu hafta ─────────────────────────── */

export function HomeProducts({ groups, settings }: { groups: HomeProductGroups; settings: StoreSettings }) {
  const empty = !groups.featured && groups.breads.length === 0 && groups.bundles.length === 0 && groups.extras.length === 0;

  return (
    <section id="ekmekler" aria-labelledby="ekmekler-baslik" className="scroll-mt-20 border-t border-krem-line bg-krem-card/60">
      {/* Eski bağlantılar (/#gurme-lezzetler, /#sarkuteri) için hedefler aşağıda */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-3">
            <Eyebrow>Sipariş ver, günü seç</Eyebrow>
            <SectionTitle id="ekmekler-baslik">Fırında bu hafta</SectionTitle>
          </div>
          <p className="text-[15px] text-krem-soft max-w-sm">
            Teslim gününü sepette seçersin. Bazı ekmekler yalnız belirli günlerde ya da önceden siparişle pişer; kartında
            yazar.
          </p>
        </div>

        {empty && (
          <p className="rounded-2xl border border-krem-line bg-krem-card p-5 text-krem-ink">
            Ürünler şu an yüklenemedi. Sayfayı yenile ya da{" "}
            <a href={businessWhatsapp(settings, "Merhaba, sipariş vermek istiyorum.")} className="underline underline-offset-2 font-semibold">
              WhatsApp&apos;tan yaz
            </a>
            , hemen yardımcı olalım.
          </p>
        )}

        {groups.featured && <FeaturedProductCard p={groups.featured} />}

        {groups.breads.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10">
            {groups.breads.map((p) => (
              <HomeProductCard key={p.id} p={p} />
            ))}
          </div>
        )}

        {groups.bundles.length > 0 && (
          <div className="pt-6 space-y-6">
            <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-krem-ink">Paketler</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10">
              {groups.bundles.map((p) => (
                <HomeProductCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        )}

        {groups.extras.length > 0 && (
          <div id="gurme-lezzetler" className="pt-6 space-y-6 scroll-mt-20">
            <span id="sarkuteri" className="block scroll-mt-20" aria-hidden="true" />
            <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-krem-ink">Ekmeğin yanına</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10">
              {groups.extras.map((p) => (
                <HomeProductCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────── 3. Bir gece ekmek yoktu ─────────────────────────── */

export function HomeStory() {
  return (
    <section id="hikaye" aria-labelledby="hikaye-baslik" className="scroll-mt-20 border-t border-krem-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid md:grid-cols-[1fr_1.2fr] gap-10 md:gap-14 items-start">
        {/* Fotoğraf/video gelene kadar tipografik not kâğıdı (stok görsel yok) */}
        <div
          aria-hidden="true"
          className="relative rounded-[24px] border border-krem-line bg-krem-card p-7 sm:p-9 rotate-[-1.5deg] shadow-[0_10px_30px_-18px_rgba(59,30,26,0.45)]"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-krem-soft">2018 · gece yarısı</p>
          <p className="mt-6 font-serif text-5xl sm:text-6xl font-semibold leading-none text-krem-ink">un</p>
          <p className="font-serif text-5xl sm:text-6xl font-semibold leading-none text-krem-ink pl-10">su</p>
          <p className="font-serif text-5xl sm:text-6xl font-semibold leading-none text-krem-accent pl-20">tuz</p>
          <p className="mt-6 font-serif italic text-lg text-krem-soft">…ve bir soba.</p>
        </div>

        <div className="space-y-5 text-[17px] leading-relaxed text-krem-soft max-w-xl">
          <Eyebrow>Nasıl başladı</Eyebrow>
          <SectionTitle id="hikaye-baslik">Bir gece ekmek yoktu.</SectionTitle>
          <p>
            2018&apos;de bir gece yarısı kendime sucuklu yumurta yaptım. Tam yiyecektim ki baktım: evde ekmek yok, açık bir
            yer de yok. Soba yanıyordu, mutfakta un vardı. Un, su, tuz; ince bir lavaş açıp sobada pişirdim, yumurtamı
            onunla yedim.
          </p>
          <p>
            Sonra merak sardı. Araştıra araştıra, deneye deneye evde ekmek yapmayı öğrendim. Komşulara vere vere atölye
            kuruldu; bugün Beylikdüzü&apos;ndeki taş fırında pişiyor.
          </p>
          <p>
            Adımızdaki <span className="font-semibold text-krem-ink">Lab</span> oradan geliyor: mutfak laboratuvarı. Hâlâ
            deniyorum, öğrendikçe burada paylaşıyorum.
          </p>
          <p className="font-serif italic text-xl text-krem-ink">Tahsin</p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── 4. Laboratuvar ─────────────────────────── */

const STEPS: [string, string][] = [
  ["Maya beslenir", "Ekşi maya un ve suyla beslenir. 4–5 saat sonra kabarıp fokurdar; hazır olduğu an hamura girer."],
  ["Un ve su dinlenir", "Un soğuk suyla karıştırılır, yoğrulmadan bir saat bekler."],
  ["Yoğrulur", "Maya eklenir, tuz en sonda. Hamur ince bir zar gibi gerilene kadar yoğrulur."],
  ["Katla, bekle", "Yaklaşık üç saat boyunca yarım saatte bir gerdirip katlıyoruz. Hamur iki katına çıkar."],
  ["Şekil ve gece", "Elle şekil verilir, sepetinde soğuk dolaba girer ve geceyi orada geçirir."],
  ["Taş fırın", "Kesik atılır; taş tabanlı fırında önce buharlı, sonra buharsız pişer. Soğuyunca kesilir."],
];

function MagnifierArt() {
  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24 sm:w-28 sm:h-28 shrink-0" aria-hidden="true">
      <circle cx="50" cy="50" r="36" fill="#FBF6EC" fillOpacity="0.1" stroke="#F6EEDF" strokeWidth="5" />
      <line x1="77" y1="77" x2="108" y2="108" stroke="#F6EEDF" strokeWidth="9" strokeLinecap="round" />
      {/* maya hücreleri ve kabarcıklar */}
      <circle cx="38" cy="42" r="7" fill="#E9B98E" />
      <circle cx="45" cy="36" r="3.5" fill="#E9B98E" />
      <circle cx="60" cy="58" r="6" fill="#E9B98E" />
      <circle cx="52" cy="64" r="3" fill="#F6EEDF" fillOpacity="0.7" />
      <circle cx="64" cy="40" r="2.5" fill="#F6EEDF" fillOpacity="0.7" />
      <path d="M30 60 q6 -6 12 0 t12 0" fill="none" stroke="#F6EEDF" strokeOpacity="0.6" strokeWidth="2" />
    </svg>
  );
}

export function HomeLab() {
  return (
    <section id="laboratuvar" aria-labelledby="lab-baslik" className="scroll-mt-20 border-t border-krem-line bg-krem-card/60">
      <span id="nasil-uretiyoruz" className="block scroll-mt-20" aria-hidden="true" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 space-y-10">
        <div className="space-y-3 max-w-2xl">
          <Eyebrow>Laboratuvar</Eyebrow>
          <SectionTitle id="lab-baslik">Bir ekmeğin 24 saati</SectionTitle>
          <p className="text-[17px] leading-relaxed text-krem-soft">
            Köy ekmeği böyle yapılıyor. Acelesi yok; işin çoğunu hamurun içindeki canlılar yapıyor, biz onlara iyi
            bakıyoruz.
          </p>
        </div>

        <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex gap-4">
              <span className="font-serif text-4xl font-semibold leading-none text-krem-accent tabular-nums w-8 shrink-0">
                {i + 1}
              </span>
              <div className="space-y-1.5">
                <h3 className="font-serif text-xl font-semibold text-krem-ink">{title}</h3>
                <p className="text-[15px] leading-relaxed text-krem-soft">{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-[15px] text-krem-soft">
          Köy ekmeği fırından çıktıktan yaklaşık 3 saat sonra kesilmeye hazır olur. Çavdar ekmeği ise iki gün dinlenir.
        </p>

        {/* Oyun daveti */}
        <Link
          href="/laboratuvar"
          className="group flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8 rounded-[24px] bg-krem-ink text-krem-paper p-6 sm:p-9 hover:bg-[#2E1714] transition-colors"
        >
          <MagnifierArt />
          <div className="flex-1 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E9B98E]">Oyun · Usta olabilir misin?</p>
            <p className="font-serif text-3xl sm:text-4xl font-semibold leading-tight">Ekmeğini kendin yap →</p>
            <p className="text-[15px] leading-relaxed text-krem-paper/85 max-w-xl">
              Mayayı besle, hamuru yoğur, fırını ayarla. Büyüteçle hamurun içindeki görünmeyen dünyaya bak.
            </p>
          </div>
          <span className="self-start sm:self-center h-12 inline-flex items-center px-6 rounded-full bg-krem-paper text-krem-ink text-[15px] font-semibold group-hover:bg-white">
            Oyna
          </span>
        </Link>
      </div>
    </section>
  );
}

/* ─────────────────────────── 5. Nerede bulunur ─────────────────────────── */

/** Şarküteri listesi `STOCKISTS` (src/lib/site.ts) boşken hiç çizilmez. */
export function HomeStockists() {
  if (STOCKISTS.length === 0) return null;
  return (
    <section id="nerede" aria-labelledby="nerede-baslik" className="scroll-mt-20 border-t border-krem-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 space-y-8">
        <div className="space-y-3">
          <Eyebrow>Şarküterilerde</Eyebrow>
          <SectionTitle id="nerede-baslik">Nerede bulunur?</SectionTitle>
        </div>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STOCKISTS.map((s) => (
            <li key={`${s.name}-${s.area}`} className="rounded-2xl border border-krem-line bg-krem-card p-5 space-y-1">
              <p className="font-serif text-xl font-semibold text-krem-ink">{s.name}</p>
              <p className="text-sm text-krem-soft">{s.address ? `${s.address}, ${s.area}` : s.area}</p>
              <p className="flex gap-4 pt-2 text-sm font-semibold text-krem-accent-ink">
                {s.mapUrl && (
                  <a href={s.mapUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    Haritada aç
                  </a>
                )}
                {s.instagram && (
                  <a
                    href={`https://www.instagram.com/${s.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    @{s.instagram}
                  </a>
                )}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ─────────────────────────── 6. Kütüphane ─────────────────────────── */

export function HomeLibrary() {
  return (
    <section id="kutuphane" aria-labelledby="kutuphane-baslik" className="scroll-mt-20 border-t border-krem-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid md:grid-cols-[1.3fr_1fr] gap-8 items-end">
        <div className="space-y-4">
          <Eyebrow>Kütüphane</Eyebrow>
          <SectionTitle id="kutuphane-baslik">Merak ettiklerimiz, kaynaklarıyla.</SectionTitle>
          <p className="text-[17px] leading-relaxed text-krem-soft max-w-xl">
            Ekmeğin içi neden delikli olur? Ekmek neden buzdolabında daha çabuk bayatlar? Öğrendiklerimizi sade bir dille,
            kaynaklarını göstererek yazıyoruz.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-end">
          <Link
            href="/kutuphane"
            className="h-12 inline-flex items-center px-6 rounded-full border border-krem-ink text-krem-ink text-[15px] font-semibold hover:bg-krem-card"
          >
            Kütüphaneye git
          </Link>
          {YOUTUBE_URL && (
            <a
              href={YOUTUBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 inline-flex items-center px-6 rounded-full border border-krem-ink text-krem-ink text-[15px] font-semibold hover:bg-krem-card"
            >
              Videolar
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── 7. İşletmenize ekmek ─────────────────────────── */

export function HomeWholesale({ settings }: { settings: StoreSettings }) {
  const wa = businessWhatsapp(settings, "Merhaba, işletmem için ekmek hakkında bilgi almak istiyorum.");
  return (
    <section id="isletmeler" aria-labelledby="isletme-baslik" className="scroll-mt-20 border-t border-krem-line bg-krem-card/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="rounded-[24px] border border-krem-line bg-krem-paper p-6 sm:p-10 grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
          <div className="space-y-4">
            <Eyebrow>Kafe · şarküteri · restoran</Eyebrow>
            <SectionTitle id="isletme-baslik">İşletmenize ekmek</SectionTitle>
            <p className="text-[17px] leading-relaxed text-krem-soft">
              Beylikdüzü&apos;nde şarküterilere her gün ekmek veriyoruz. Senin işletmene de olur: hangi ekmek, kaç adet,
              hangi günler; yaz, birlikte planlayalım.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 inline-flex items-center justify-center px-6 rounded-full bg-krem-accent text-white text-[15px] font-semibold hover:bg-krem-accent-ink"
            >
              WhatsApp&apos;tan yaz
            </a>
            <a
              href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("İşletme için ekmek")}`}
              className="h-12 inline-flex items-center justify-center px-6 rounded-full border border-krem-ink text-krem-ink text-[15px] font-semibold hover:bg-krem-card"
            >
              E-posta gönder
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── 8. Sık sorulanlar ─────────────────────────── */

export function HomeFaq({ settings }: { settings: StoreSettings }) {
  const days = deliveryDaysLabel(settings.openWeekdays);
  const minBasket = settings.minBasketAmount > 0 ? ` En az sipariş tutarı ${formatTl(settings.minBasketAmount)}.` : "";
  const ahead = settings.maxDaysAhead > 0 ? ` En fazla ${settings.maxDaysAhead} gün sonrası için sipariş verebilirsin.` : "";
  const items: [string, ReactNode][] = [
    [
      "Hangi günler teslimat var?",
      <>
        {days}, {settings.deliveryWindow} arası; Beylikdüzü&apos;ne kendimiz getiriyoruz. Uygun günleri sepette
        görürsün; bazı ekmekler yalnız belirli günlerde ya da önceden siparişle pişer.{ahead}
      </>,
    ],
    [
      "Hangi mahallelere geliyorsunuz?",
      <>
        {settings.neighborhoods.join(", ")}. Mahallen listede yoksa{" "}
        <a href={businessWhatsapp(settings)} className="underline underline-offset-2 font-semibold text-krem-ink">
          WhatsApp&apos;tan sor
        </a>
        .
      </>,
    ],
    ["Teslimat ücreti ne kadar?", <>{shippingText(settings)}.{minBasket}</>],
    [
      "Nasıl öderim?",
      <>Kapıda nakit ya da kartla. İstersen siparişi ver, ödemeyi WhatsApp&apos;ta konuşalım.</>,
    ],
    [
      "Ekmeği nasıl saklarım?",
      <>
        Oda sıcaklığında, bez torbada ya da kesik yüzü tahtaya bakacak şekilde. Buzdolabına koyma: ekmek en hızlı orada
        bayatlar. Bayatlamak kurumak değildir; nişasta soğudukça yeniden sertleşir ve bu en hızlı buzdolabı
        sıcaklığında olur.
      </>,
    ],
    [
      "Dondurabilir miyim?",
      <>
        Evet, saklamanın en iyi yolu bu. Birkaç günde bitiremeyeceksen dilimleyip dondur; dondurucu bayatlamayı durdurur.
        Dilimleri çözdürmeden kızartabilir ya da fırında ısıtabilirsin.
      </>,
    ],
    ["Kargo var mı?", <>Şimdilik yok; yalnız Beylikdüzü&apos;ne kendimiz getiriyoruz.</>],
    [
      "Ekşi mayalı ekmek glutensiz mi?",
      <>
        Hayır. Ekmeklerimiz buğday (siyez, karakılçık gibi eski buğdaylar dahil) ya da çavdar unuyla yapılır ve gluten
        içerir; çölyak hastaları için uygun değildir.
      </>,
    ],
  ];

  return (
    <section id="sss" aria-labelledby="sss-baslik" className="scroll-mt-20 border-t border-krem-line">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20 space-y-8">
        <div className="space-y-3">
          <Eyebrow>Komşu soruyor</Eyebrow>
          <SectionTitle id="sss-baslik">Sık sorulanlar</SectionTitle>
        </div>
        <div className="divide-y divide-krem-line border-y border-krem-line">
          {items.map(([q, a]) => (
            <details key={q} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-serif text-lg sm:text-xl font-semibold text-krem-ink [&::-webkit-details-marker]:hidden">
                {q}
                <span
                  aria-hidden="true"
                  className="shrink-0 w-8 h-8 rounded-full border border-krem-line flex items-center justify-center text-krem-accent-ink transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-5 pr-10 text-[16px] leading-relaxed text-krem-soft">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

