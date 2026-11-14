import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";
import { ProductDetailClientActions } from "@/components/storefront/ProductDetailClientActions";
import { FoodComplianceNotice } from "@/components/storefront/FoodComplianceNotice";
import { SafeProductImage } from "@/components/storefront/SafeProductImage";
import {
  BatchPassport,
  QrPassportGreeting,
} from "@/components/storefront/BatchPassport";
import { StalingSimulator } from "@/components/bilim/StalingSimulator";
import type { ExtendedProduct, MasterclassDetail } from "@/types";
import {
  getDefaultStorageGuidance,
  isRawMilkProduct,
} from "@/lib/products/foodCompliance";
import { isAccompaniment, isSpecialtyBread } from "@/lib/products/grouping";
import { getProductPlaceholder } from "@/lib/products/map";
import { getSmartPairings } from "@/lib/products/pairingChemistry";
import {
  getCatalog,
  getProductBySlugOrId as getProductBySlugOrIdServer,
} from "@/lib/products/server";
import { getLatestProductBake } from "@/lib/bake/server";
import { inferBreadStarchProfile } from "@/lib/baking/staling";
import { slugify, getProductSlug, getProductUrl } from "@/lib/utils/slugify";
import { ShippingPolicyNote } from "@/components/storefront/ShippingPolicyNote";
import {
  Truck,
  ArrowLeft,
  ChevronRight,
  Flame,
  BookOpen,
} from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { FEATURES } from "@/lib/features";
import { ekmeginAnlari } from "@/lib/bilim";
import { getProductStory, mediaBaseUrl } from "@/lib/hikaye/storyServer";
import type { StoryStep } from "@/lib/hikaye/story";
import { NasilYapiliyor, type AnBaglantisi } from "@/components/storefront/NasilYapiliyor";
import { getAn, getAnKimlikleri } from "@/lib/bilim/server";
import { LEVHALAR } from "@/lib/bilim/levhalar";
import { BilimKoprusu, type KopruAni } from "@/components/bilim/Kopru";

export const revalidate = 60; // ISR: Revalidate product page every 60 seconds

async function getProductBySlugOrId(slugOrId: string): Promise<ExtendedProduct | null> {
  const clean = decodeURIComponent(slugOrId).trim().toLowerCase();
  const direct = await getProductBySlugOrIdServer(clean);
  if (direct) return direct;
  // Eski linkler: ada göre üretilmiş slug
  const { products } = await getCatalog();
  return (
    products.find(
      (p) =>
        p.slug === clean ||
        p.id.toLowerCase() === clean ||
        slugify(p.name) === clean
    ) ?? null
  );
}

async function getAllProducts(): Promise<ExtendedProduct[]> {
  return (await getCatalog()).products;
}

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((p) => ({
    slug: getProductSlug(p),
  }));
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ ref?: string | string[] }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlugOrId(slug);

  if (!product) {
    return {
      title: "Ürün Bulunamadı | EkmekLab Taş Fırın",
      description: "Aradığınız artisan ürün bulunamadı.",
    };
  }

  const isBreadProduct = !isAccompaniment(product);
  const title = isBreadProduct
    ? `${product.name} | EkmekLab Taş Fırın`
    : `${product.name} | EkmekLab Mandıra & Şarküteri`;
  const description =
    product.description ||
    (isBreadProduct
      ? `${product.name} - Canlı ekşi maya ve uzun fermantasyonla taş fırında pişen artisan ekmek.`
      : "EkmekLab doğal mandıra ve şarküteri seçkisi — günlük taze tedarik ile Beylikdüzü'nde kapınızda.");
  const url = `${SITE_URL}/urun/${getProductSlug(product)}`;
  const metaImage = product.imageUrl || getProductPlaceholder(product.category);

  return {
    title,
    description,
    keywords: [
      product.name,
      ...(product.flourTypes || []),
      ...(product.ingredients || []),
      ...(isBreadProduct
        ? ["ekşi mayalı ekmek", "artisan fırın", "Beylikdüzü ekmek"]
        : ["doğal mandıra", "gurme şarküteri", "Beylikdüzü doğal ürünler"]),
      "EkmekLab",
    ],
    openGraph: {
      title,
      description,
      url,
      siteName: "EkmekLab",
      locale: "tr_TR",
      type: "website",
      images: [
        {
          url: metaImage,
          width: 900,
          height: 600,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [metaImage],
    },
    alternates: {
      canonical: url,
    },
  };
}

// QR köprüsü: bilim odası açılana kadar kapalı (FEATURES.bilimOdasi).
function bilimAnlari(product: ExtendedProduct): KopruAni[] {
  if (!FEATURES.bilimOdasi) return [];
  try {
    const sira = getAnKimlikleri();
    return ekmeginAnlari(product).map((id) => {
      const an = getAn(id);
      const r = LEVHALAR[id]?.rakamlar[0];
      return {
        id,
        no: sira.indexOf(id) + 1,
        baslik: an.baslik,
        soru: an.soru,
        rakam: r ? `${r.deger} ${r.birim}`.trim() : undefined,
      };
    });
  } catch (e) {
    // köprü ürün sayfasını bozmaz
    console.error("bilim köprüsü:", e);
    return [];
  }
}

// Adımlarda seçilen Bilim anlarının başlıkları; okunamayan an bağlantısız kalır.
function adimAnlari(steps: StoryStep[]): Record<string, AnBaglantisi> {
  const out: Record<string, AnBaglantisi> = {};
  for (const s of steps) {
    if (!s.anId || out[s.anId]) continue;
    try {
      out[s.anId] = { id: s.anId, baslik: getAn(s.anId).baslik };
    } catch (e) {
      console.error("adım anı:", e);
    }
  }
  return out;
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductPageProps) {
  const [{ slug }, resolvedSearch] = await Promise.all([
    params,
    searchParams ?? Promise.resolve(undefined),
  ]);

  const product = await getProductBySlugOrId(slug);
  if (!product) {
    notFound();
  }

  // Fırın iddiaları (taş taban, ekşi maya, ~24 saat) yalnız ekmeklerde; süt/yoğurt/şarküteri sayfasında görünmez.
  const isBread = !isAccompaniment(product);
  const isSpecialty = isSpecialtyBread(product);
  const isRawMilk = isRawMilkProduct(product);

  const [allProducts, steps, latestBake] = await Promise.all([
    getAllProducts(),
    getProductStory(product.id),
    isBread ? getLatestProductBake(product.id) : Promise.resolve(null),
  ]);

  const rawRef = resolvedSearch?.ref;
  const qrRef = Array.isArray(rawRef) ? rawRef[0] : rawRef;

  const smartPairings = getSmartPairings(product, allProducts, 4);

  type ExtendedMasterclass = MasterclassDetail & {
    sensory?: string;
    storage?: string;
  };

  const masterclass: ExtendedMasterclass | undefined = product.masterclass;
  const storageText =
    masterclass?.pairingStorage ||
    masterclass?.storage ||
    getDefaultStorageGuidance(product);
  const masterclassEntries = [
    masterclass?.flourHeritage
      ? {
          title: isBread ? "Unun ve Mayanın Kökeni" : "Üretici & Kaynak Hikâyesi",
          body: masterclass.flourHeritage,
        }
      : null,
    masterclass?.technique
      ? {
          title: isBread
            ? "Fermantasyon ve Tezgâh Tekniği"
            : "Üretim & Hazırlık Yöntemi",
          body: masterclass.technique,
        }
      : null,
    masterclass?.sensory
      ? {
          title: "Doku & Lezzet Notları",
          body: masterclass.sensory,
        }
      : null,
    storageText
      ? {
          title: isBread ? "Dilimleme & Saklama" : "Tüketim & Saklama",
          body: storageText,
        }
      : null,
  ].filter((item): item is { title: string; body: string } => item !== null);

  const hasIngredients = Boolean(
    product.ingredients && product.ingredients.length > 0
  );
  const canonicalSlug = getProductSlug(product);

  // Schema.org Product + Offer JSON-LD structured data (P2-3)
  const productJsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    image: [product.imageUrl],
    description: product.description,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: "EkmekLab",
    },
    category: product.category,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/urun/${canonicalSlug}`,
      priceCurrency: "TRY",
      price: product.price,
      availability:
        product.isAvailable !== false
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Bakery",
        name: "EkmekLab",
      },
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink font-sans selection:bg-accent/20 selection:text-ink pb-24 lg:pb-0">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      <Navbar />

      <main className="flex-1 py-8 sm:py-12 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-12 sm:space-y-16">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs font-sans text-ink-muted"
        >
          <Link href="/" className="hover:text-accent transition-colors">
            Ana Sayfa
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
          <Link
            href={isBread ? "/#ekmekler" : "/#sarkuteri"}
            className="hover:text-accent transition-colors"
          >
            {!isBread
              ? "Mandıra & Şarküteri"
              : isSpecialty
              ? "Özel Ekmekler"
              : "Taş Fırın Ekmekleri"}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
          <span className="text-ink font-medium truncate max-w-[200px] sm:max-w-none">
            {product.name}
          </span>
        </nav>

        {/* QR Mühür Karşılama Şeridi (yalnız ekmeklerde ve ?ref=qr... ile gelindiğinde) */}
        {isBread && (
          <QrPassportGreeting productName={product.name} qrRef={qrRef} />
        )}

        {/* 1. Main Product Section (2-Column) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Visual Showcase */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative rounded-3xl overflow-hidden bg-cream-surface border border-line shadow-2xl aspect-[16/10] sm:aspect-[1/1] group">
              <SafeProductImage
                src={product.imageUrl}
                fallbackSrc={getProductPlaceholder(product.category)}
                alt={product.name}
                priority={true}
                isAccompanimentItem={!isBread}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 pointer-events-none" />

              {/* Badges on Image */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none">
                {product.madeToOrder ? (
                  <span className="px-3 py-1 rounded-full bg-accent text-white text-xs font-sans font-bold uppercase shadow-md">
                    {isBread
                      ? "Ön Siparişle Taze Pişer"
                      : "Sipariş Üzerine Hazırlanır"}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-cream-surface text-good border border-line text-xs font-sans font-bold uppercase shadow-md">
                    {isBread
                      ? "Günlük Taş Fırın Üretimi"
                      : "Günlük Taze Mandıra & Şarküteri"}
                  </span>
                )}
              </div>

              {/* Bottom Quick Tag */}
              {isBread && (
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-ink bg-cream-surface/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-line shadow-xs">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-accent" aria-hidden="true" />
                    <span>Taş tabanlı fırında pişer</span>
                  </div>
                  <div className="font-mono text-accent font-bold">
                    {product.weight} {product.weightUnit || "g"}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Information, Pricing & Interactive Add-to-Cart */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-md bg-bg border border-line text-accent text-xs font-mono font-medium">
                  {!isBread
                    ? "MANDIRA & ŞARKÜTERİ"
                    : isSpecialty
                    ? "ÖZEL SERİ"
                    : "EKŞİ MAYALI EKMEK"}
                </span>
                {isBread && product.hydration && (
                  <span className="px-2.5 py-0.5 rounded-md bg-bg border border-line text-ink-muted text-xs font-mono">
                    %{product.hydration} Hidrasyon
                  </span>
                )}
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-tight">
                {product.name}
              </h1>

              <p className="mt-4 text-sm sm:text-base text-ink-muted leading-relaxed font-sans">
                {product.description}
              </p>
            </div>

            {isRawMilk && (
              <FoodComplianceNotice product={product} variant="full" />
            )}

            {/* Client Interactive Add-to-Cart & Stepper */}
            <ProductDetailClientActions product={{ ...product, masterclass: undefined }} />

            {!isRawMilk && (
              <FoodComplianceNotice product={product} variant="full" />
            )}

            {/* Delivery Guarantee Info Box */}
            <div className="p-4 rounded-2xl bg-cream-surface border border-line space-y-2 text-xs font-sans text-ink-muted">
              <div className="flex items-center gap-2 text-accent font-bold">
                <Truck className="w-4 h-4" aria-hidden="true" />
                <span>Kendi Fırın Kuryemizle Kapınıza Teslimat</span>
              </div>
              <p className="text-ink-muted leading-relaxed">
                Beylikdüzü içinde seçtiğiniz gün kapınıza ulaştırıyoruz.{" "}
                <ShippingPolicyNote />.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Ekmeklerde Tek ve Zarif Taş Fırın Reçete Cetveli + Canlı Parti Pasaportu; Eşlikçilerde Sade İçindekiler */}
        {isBread ? (
          <BatchPassport product={product} latestBake={latestBake} />
        ) : (
          hasIngredients &&
          product.ingredients && (
            <section className="pt-6 border-t border-line">
              <div className="p-5 sm:p-6 rounded-2xl bg-cream-surface border border-line space-y-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent font-semibold">
                    DOĞAL ÜRETİCİ SEÇKİSİ
                  </p>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-ink mt-0.5">
                    İçindekiler &amp; Kaynak Bilgisi
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {product.ingredients.map((ing, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-lg bg-bg border border-line text-xs text-ink font-sans"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )
        )}

        {/* Yapılış Hikâyesi & Bilim Köprüsü */}
        <NasilYapiliyor
          name={product.name}
          steps={steps}
          mediaBase={mediaBaseUrl()}
          anlar={adimAnlari(steps)}
        />

        <BilimKoprusu anlar={bilimAnlari(product)} />

        {/* Ekmeklerde Evde Saklama & Nişasta Kristalleşme Simülatörü */}
        {isBread && (
          <section
            aria-label="Bu somunun evde saklama ve tazelik simülasyonu"
            className="pt-6 border-t border-line"
          >
            <StalingSimulator
              compact
              initialProfile={inferBreadStarchProfile(product)}
            />
          </section>
        )}

        {/* 3. Ustanın / Üreticinin Defteri (Sadeleştirilmiş Editoryal Sütunlar) */}
        {masterclassEntries.length > 0 && (
          <section className="pt-6 border-t border-line">
            <div className="mb-5">
              <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-accent uppercase tracking-wider mb-1">
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                <span>
                  {isBread ? "USTANIN TEZGÂH NOTLARI" : "ÜRETİCİ NOTU & SEÇKİ"}
                </span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                {isBread
                  ? "Zanaatın Perde Arkası ve Fermantasyon Notları"
                  : "Üretim & Sofrada Kullanım Notları"}
              </h2>
            </div>

            <div className="rounded-2xl border border-line bg-cream-surface divide-y md:divide-y-0 md:grid md:grid-cols-2 md:divide-x divide-line">
              {masterclassEntries.map((entry, idx) => (
                <div
                  key={entry.title}
                  className={`p-5 sm:p-6 space-y-2 ${
                    idx >= 2 ? "md:border-t md:border-line" : ""
                  }`}
                >
                  <p className="font-mono text-[11px] uppercase tracking-wider text-accent font-semibold">
                    № 0{idx + 1}
                  </p>
                  <h3 className="font-serif text-lg font-bold text-ink">
                    {entry.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-sans">
                    {entry.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. Akıllı Eşleşme & Gıda Kimyası Önerileri */}
        {smartPairings.length > 0 && (
          <section className="pt-6 border-t border-line space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent font-semibold">
                  SOFRA VE DOKU EŞLEŞMESİ
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-0.5">
                  {isBread
                    ? "Bu Somunun Yanına Yakışan Eşlikçiler"
                    : "Bu Eşlikçiyi Taşıyan Taş Fırın Somunları"}
                </h2>
                <p className="text-xs sm:text-sm text-ink-muted font-sans mt-1">
                  {isBread
                    ? "Ekşi maya asitliği ve taş taban kabuğuyla damakta katman kuran günlük mandıra ve şarküteri seçkimiz."
                    : "Aynı teslimat sepetinde sıcak fırından çıkan somunlarla tamamlanan sofra uyumu."}
                </p>
              </div>
              <Link
                href={isBread ? "/#sarkuteri" : "/#ekmekler"}
                className="min-h-11 inline-flex items-center gap-1 text-xs text-accent hover:underline font-serif shrink-0"
              >
                <span>Tüm Seçkiyi Gör</span>
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {smartPairings.map(({ product: rel, chemistryLabel, chemistryNote }) => (
                <Link
                  key={rel.id}
                  href={getProductUrl(rel)}
                  className="group rounded-2xl bg-cream-surface border border-line hover:border-accent/50 p-4 transition-all duration-300 flex flex-col justify-between space-y-3 shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="relative h-40 w-full rounded-xl overflow-hidden bg-bg border border-line/60">
                      <SafeProductImage
                        src={rel.imageUrl}
                        fallbackSrc={getProductPlaceholder(rel.category)}
                        alt={rel.name}
                        priority={false}
                        isAccompanimentItem={isAccompaniment(rel)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-95"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="inline-block font-mono text-[10px] uppercase tracking-wider text-accent font-semibold">
                        {chemistryLabel}
                      </span>
                      <h3 className="font-serif font-bold text-base text-ink group-hover:text-accent transition-colors line-clamp-1">
                        {rel.name}
                      </h3>
                      <p className="text-xs text-ink-muted leading-relaxed font-sans">
                        {chemistryNote}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between pt-2.5 border-t border-line">
                    <span className="font-serif font-bold text-base text-ink">
                      {rel.price}{" "}
                      <span className="text-xs text-accent font-sans font-normal">
                        TL
                      </span>
                    </span>
                    <span className="text-xs text-accent font-sans font-medium group-hover:underline">
                      İncele →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Back To Storefront Link */}
        <div className="pt-4 text-center">
          <Link
            href="/"
            className="min-h-11 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cream-surface border border-line hover:border-accent/40 text-xs font-serif text-ink transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-accent" aria-hidden="true" />
            <span>Ana Sayfaya ve Tüm Fırın Kataloğuna Dön</span>
          </Link>
        </div>
      </main>

      <Footer />
      <CartDrawer />
      <OrderSuccessModal />
    </div>
  );
}
