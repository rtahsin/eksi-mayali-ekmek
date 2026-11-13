import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";
import { ProductDetailClientActions } from "@/components/storefront/ProductDetailClientActions";
import { SafeProductImage } from "@/components/storefront/SafeProductImage";
import type { ExtendedProduct, MasterclassDetail } from "@/types";
import { isAccompaniment, isSpecialtyBread } from "@/lib/products/grouping";
import { getProductPlaceholder } from "@/lib/products/map";
import { getCatalog, getProductBySlugOrId as getProductBySlugOrIdServer } from "@/lib/products/server";
import { slugify, getProductSlug, getProductUrl } from "@/lib/utils/slugify";
import { ShippingPolicyNote } from "@/components/storefront/ShippingPolicyNote";
import {
  Wheat,
  Activity,
  ShieldCheck,
  Sparkles,
  Truck,
  ArrowLeft,
  ChevronRight,
  Flame,
  Clock,
  Droplets,
  Award,
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
  return products.find((p) => p.slug === clean || p.id.toLowerCase() === clean || slugify(p.name) === clean) ?? null;
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
      return { id, no: sira.indexOf(id) + 1, baslik: an.baslik, soru: an.soru, rakam: r ? `${r.deger} ${r.birim}`.trim() : undefined };
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

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlugOrId(slug);

  if (!product) {
    notFound();
  }

  const [allProducts, steps] = await Promise.all([getAllProducts(), getProductStory(product.id)]);
  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id && p.isActive !== false)
    .slice(0, 4);

  type ExtendedMasterclass = MasterclassDetail & {
    sensory?: string;
    storage?: string;
  };

  // Fırın iddiaları (taş taban, ekşi maya, ~24 saat) yalnız ekmeklerde; süt/yoğurt/şarküteri sayfasında görünmez.
  const isBread = !isAccompaniment(product);
  const isSpecialty = isSpecialtyBread(product);
  const masterclass: ExtendedMasterclass | undefined = product.masterclass;
  const storageText = masterclass?.pairingStorage || masterclass?.storage;
  const hasMasterclassContent = Boolean(
    masterclass &&
      (masterclass.flourHeritage ||
        masterclass.technique ||
        masterclass.sensory ||
        storageText)
  );
  const hasIngredients = Boolean(product.ingredients && product.ingredients.length > 0);
  const showIdentitySection = isBread || hasIngredients;
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
    <div className="min-h-screen flex flex-col bg-bg text-ink font-sans selection:bg-accent/20 selection:text-ink">
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
          <ChevronRight className="w-3.5 h-3.5 text-ink-muted" />
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
          <ChevronRight className="w-3.5 h-3.5 text-ink-muted" />
          <span className="text-ink font-medium truncate max-w-[200px] sm:max-w-none">
            {product.name}
          </span>
        </nav>

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
                    {isBread ? "Ön Siparişle Taze Pişer" : "Sipariş Üzerine Hazırlanır"}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-cream-surface text-good border border-line text-xs font-sans font-bold uppercase shadow-md">
                    {isBread ? "Günlük Taş Fırın Üretimi" : "Günlük Taze Mandıra & Şarküteri"}
                  </span>
                )}
              </div>

              {/* Bottom Quick Tag */}
              {isBread && (
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-ink bg-cream-surface/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-line shadow-xs">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-accent" />
                  <span>Taş tabanlı fırında pişer</span>
                </div>
                <div className="font-mono text-accent font-bold">
                  {product.weight} {product.weightUnit || "g"}
                </div>
              </div>
              )}
            </div>

            {/* Quick Guarantees */}
            {isBread && (
            <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-cream-surface border border-line">
                <Clock className="w-4 h-4 text-accent mx-auto mb-1" />
                <span className="font-bold text-ink block">~24 Saat</span>
                <span className="text-ink-muted text-xs">Yapım Süreci</span>
              </div>
              <div className="p-3 rounded-xl bg-cream-surface border border-line">
                <Wheat className="w-4 h-4 text-accent mx-auto mb-1" />
                <span className="font-bold text-ink block">Ekşi Maya</span>
                <span className="text-ink-muted text-xs">Hazır Maya Yok</span>
              </div>
              <div className="p-3 rounded-xl bg-cream-surface border border-line">
                <ShieldCheck className="w-4 h-4 text-good mx-auto mb-1" />
                <span className="font-bold text-ink block">Taş Taban</span>
                <span className="text-ink-muted text-xs">Fırında Pişim</span>
              </div>
            </div>
            )}
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

            {/* Client Interactive Add-to-Cart & Stepper */}
            <ProductDetailClientActions product={{ ...product, masterclass: undefined }} />

            {/* Delivery Guarantee Info Box */}
            <div className="p-4 rounded-2xl bg-cream-surface border border-line space-y-2 text-xs font-sans text-ink-muted">
              <div className="flex items-center gap-2 text-accent font-bold">
                <Truck className="w-4 h-4" />
                <span>Kendi Fırın Kuryemizle Kapınıza Teslimat</span>
              </div>
              <p className="text-ink-muted leading-relaxed">
                Beylikdüzü içinde seçtiğiniz gün kapınıza ulaştırıyoruz.{" "}
                <ShippingPolicyNote />.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Artisan DNA Specifications / Ingredients */}
        {showIdentitySection && (
          <section className="pt-6 border-t border-line">
            <div className="mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink flex items-center gap-2.5">
                <Sparkles className="w-6 h-6 text-accent" />
                <span>
                  {isBread
                    ? "Ürün Kimliği & Zanaat Özellikleri"
                    : "İçindekiler & Değerler"}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted mt-1 font-sans">
                {isBread
                  ? "EkmekLab mutfağında her somunun ardında şeffaf ve tavizsiz bir zanaat yatar."
                  : "Katkısız, koruyucusuz ve günlük taze tedarik edilen doğal üretici seçkisi."}
              </p>
            </div>

            {isBread && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Spec 1: Hydration */}
                <div className="p-5 rounded-2xl bg-cream-surface border border-line space-y-1">
                  <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-wider">
                    <Droplets className="w-4 h-4" />
                    <span>Hidrasyon (Su Oranı)</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-ink pt-1">
                    {product.hydration ? `%${product.hydration}` : "Doğal Kıvam"}
                  </div>
                  <p className="text-xs text-ink-muted">
                    Yüksek su oranı ile yumuşak, geniş gözenekli ve nemli iç doku.
                  </p>
                </div>

                {/* Spec 2: Fermentation */}
                <div className="p-5 rounded-2xl bg-cream-surface border border-line space-y-1">
                  <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-wider">
                    <Clock className="w-4 h-4" />
                    <span>Yapım Süreci</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-ink pt-1">
                    ~24 Saat
                  </div>
                  <p className="text-xs text-ink-muted">
                    Ekşi mayanın hamuru yavaşça olgunlaştırdığı süre.
                  </p>
                </div>

                {/* Spec 3: Flour Types */}
                <div className="p-5 rounded-2xl bg-cream-surface border border-line space-y-1">
                  <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-wider">
                    <Wheat className="w-4 h-4" />
                    <span>Un & Tahıl Cinsi</span>
                  </div>
                  <div className="font-serif text-lg font-bold text-ink pt-1 truncate">
                    {product.flourTypes && product.flourTypes.length > 0
                      ? product.flourTypes.join(", ")
                      : product.ingredients?.[0] ?? "Ekşi maya"}
                  </div>
                  <p className="text-xs text-ink-muted">
                    Bu ekmekte kullanılan un ve tahıllar.
                  </p>
                </div>

                {/* Spec 4: Clean Label */}
                <div className="p-5 rounded-2xl bg-cream-surface border border-line space-y-1">
                  <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Temiz İçerik</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-good pt-1">
                    Ekşi Maya
                  </div>
                  <p className="text-xs text-ink-muted">
                    Hazır (ticari) maya kullanılmaz.
                  </p>
                </div>
              </div>
            )}

            {/* Ingredients list */}
            {hasIngredients && product.ingredients && (
              <div className="mt-4 p-5 rounded-2xl bg-cream-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-ink font-serif text-sm font-bold shrink-0">
                  <Award className="w-4 h-4 text-accent" />
                  <span>İçindekiler Listesi:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.ingredients.map((ing, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-lg bg-bg border border-line text-ink font-sans"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <NasilYapiliyor name={product.name} steps={steps} mediaBase={mediaBaseUrl()} anlar={adimAnlari(steps)} />

        <BilimKoprusu anlar={bilimAnlari(product)} />

        {/* 3. Deep Dive Masterclass: Zanaat & Lezzet Hikayesi */}
        {hasMasterclassContent && masterclass && (
          <section className="pt-6 border-t border-line">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 font-serif text-xs font-bold text-accent uppercase tracking-wider mb-2">
                <BookOpen className="w-4 h-4" />
                <span>
                  {isBread ? "USTANIN NOTU & BİYOLOJİ" : "ÜRETİCİ NOTU & SEÇKİ"}
                </span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                {isBread
                  ? "Zanaatın Perde Arkası ve Fermantasyon Biyolojisi"
                  : "Zanaat & Lezzet Hikâyesi"}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Flour & Yeast / Producer & Source Heritage */}
              {masterclass.flourHeritage && (
                <div className="p-6 rounded-3xl bg-cream-surface border border-line space-y-3">
                  <div className="flex items-center gap-2.5 text-accent font-serif font-bold text-base">
                    <Wheat className="w-5 h-5 text-accent shrink-0" />
                    <span>
                      {isBread ? "Unun ve Mayanın Kökeni" : "Üretici & Kaynak Hikâyesi"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-sans">
                    {masterclass.flourHeritage}
                  </p>
                </div>
              )}

              {/* Card 2: Fermentation / Production Technique */}
              {masterclass.technique && (
                <div className="p-6 rounded-3xl bg-cream-surface border border-line space-y-3">
                  <div className="flex items-center gap-2.5 text-accent font-serif font-bold text-base">
                    <Activity className="w-5 h-5 text-accent shrink-0" />
                    <span>
                      {isBread
                        ? "Fermantasyon ve Zanaat Tekniği"
                        : "Üretim & Hazırlık Yöntemi"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-sans">
                    {masterclass.technique}
                  </p>
                </div>
              )}

              {/* Card 3: Sensory & Flavor Notes */}
              {masterclass.sensory && (
                <div className="p-6 rounded-3xl bg-cream-surface border border-line space-y-3">
                  <div className="flex items-center gap-2.5 text-accent font-serif font-bold text-base">
                    <Award className="w-5 h-5 text-accent shrink-0" />
                    <span>Doku & Lezzet Notları</span>
                  </div>
                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-sans">
                    {masterclass.sensory}
                  </p>
                </div>
              )}

              {/* Card 4: Pairing & Storage */}
              {storageText && (
                <div className="p-6 rounded-3xl bg-cream-surface border border-line space-y-3">
                  <div className="flex items-center gap-2.5 text-accent font-serif font-bold text-base">
                    <Sparkles className="w-5 h-5 text-accent shrink-0" />
                    <span>
                      {isBread ? "Nasıl Tüketilmeli & Saklanmalı?" : "Tüketim & Saklama"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-sans">
                    {storageText}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 4. Related Products Carousel / Grid */}
        {relatedProducts.length > 0 && (
          <section className="pt-6 border-t border-line space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-2xl font-bold text-ink">
                  {isBread ? "Fırından Birlikte İyi Gidenler" : "Yanına Çok Yakışır"}
                </h3>
                <p className="text-xs text-ink-muted font-sans mt-0.5">
                  {isBread
                    ? "Bu lezzete eşlik eden diğer ekmeklerimiz ve mandıra gurme seçkisi."
                    : "Taş fırın ekmeklerimiz ve doğal mandıra seçkimizden diğer lezzetler."}
                </p>
              </div>
              <Link
                href="/#ekmekler"
                className="text-xs text-accent hover:underline font-serif flex items-center gap-1"
              >
                <span>Tüm Kataloğu Gör</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedProducts.map((rel) => (
                <Link
                  key={rel.id}
                  href={getProductUrl(rel)}
                  className="group rounded-2xl bg-cream-surface border border-line hover:border-accent/40 p-4 transition-all duration-300 flex flex-col justify-between space-y-3"
                >
                  <div className="relative h-40 w-full rounded-xl overflow-hidden bg-bg">
                    <SafeProductImage
                      src={rel.imageUrl}
                      fallbackSrc={getProductPlaceholder(rel.category)}
                      alt={rel.name}
                      priority={false}
                      isAccompanimentItem={isAccompaniment(rel)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-95"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-serif font-bold text-sm text-ink group-hover:text-accent transition-colors line-clamp-1">
                      {rel.name}
                    </h4>
                    <p className="text-xs text-ink-muted line-clamp-2 mt-1 font-sans">
                      {rel.description}
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between pt-2 border-t border-line">
                    <span className="font-serif font-bold text-base text-ink">
                      {rel.price} <span className="text-xs text-accent font-sans font-normal">TL</span>
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cream-surface border border-line hover:border-accent/40 text-xs font-serif text-ink transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-accent" />
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
