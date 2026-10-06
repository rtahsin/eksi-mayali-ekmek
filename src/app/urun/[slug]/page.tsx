import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";
import { ProductDetailClientActions } from "@/components/storefront/ProductDetailClientActions";
import type { ExtendedProduct } from "@/types";
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

  const title = `${product.name} | EkmekLab Taş Fırın`;
  const description =
    product.description ||
    `${product.name} - Canlı ekşi maya ve uzun fermantasyonla taş fırında pişen artisan ekmek.`;
  const url = `${SITE_URL}/urun/${getProductSlug(product)}`;

  return {
    title,
    description,
    keywords: [
      product.name,
      ...(product.flourTypes || []),
      ...(product.ingredients || []),
      "ekşi mayalı ekmek",
      "artisan fırın",
      "Beylikdüzü ekmek",
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
          url: product.imageUrl,
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
      images: [product.imageUrl],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlugOrId(slug);

  if (!product) {
    notFound();
  }

  const allProducts = await getAllProducts();
  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id && p.isActive !== false)
    .slice(0, 4);

  const masterclass = product.masterclass;
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
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-artisan-amber/20 selection:text-artisan-gold">
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
          className="flex items-center gap-2 text-xs font-sans text-foreground/60"
        >
          <Link href="/" className="hover:text-artisan-gold transition-colors">
            Ana Sayfa
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-foreground/40" />
          <Link
            href="/#ekmekler"
            className="hover:text-artisan-gold transition-colors capitalize"
          >
            {product.category === "bread"
              ? "Taş Fırın Ekmekleri"
              : product.category === "specialty"
              ? "Özel Ekmekler"
              : "Gurme Lezzetler"}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-foreground/40" />
          <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">
            {product.name}
          </span>
        </nav>

        {/* 1. Main Product Section (2-Column) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Visual Showcase */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative rounded-3xl overflow-hidden bg-surface border border-surface-border shadow-2xl aspect-[16/10] sm:aspect-[1/1] group">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface/80 via-transparent to-transparent opacity-60" />

              {/* Badges on Image */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none">
                {product.madeToOrder ? (
                  <span className="px-3 py-1 rounded-full bg-artisan-terracotta text-foreground text-xs font-sans font-bold uppercase shadow-md">
                    Ön Siparişle Taze Pişer
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-xs font-sans font-bold uppercase shadow-md">
                    Günlük Taş Fırın Üretimi
                  </span>
                )}
                {product.isPopular && (
                  <span className="px-3 py-1 rounded-full bg-artisan-gold/90 text-[#120E0B] text-xs font-sans font-bold uppercase shadow-md">
                    Çok Sevilen
                  </span>
                )}
              </div>

              {/* Bottom Quick Tag */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-artisan-cream/90 bg-background/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-artisan-gold" />
                  <span>Meşe Odunu ve Taş Taban Pişimi</span>
                </div>
                <div className="font-mono text-artisan-gold font-bold">
                  {product.weight} {product.weightUnit || "g"}
                </div>
              </div>
            </div>

            {/* Quick Guarantees */}
            <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-surface border border-surface-border">
                <Clock className="w-4 h-4 text-artisan-gold mx-auto mb-1" />
                <span className="font-bold text-foreground block">Uzun</span>
                <span className="text-foreground/60 text-[11px]">Soğuk Mayalanma</span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-surface-border">
                <Wheat className="w-4 h-4 text-artisan-terracotta mx-auto mb-1" />
                <span className="font-bold text-foreground block">Atalık Un</span>
                <span className="text-foreground/60 text-[11px]">Taş Değirmen</span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-surface-border">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <span className="font-bold text-foreground block">Taş Fırın</span>
                <span className="text-foreground/60 text-[11px]">Günlük Pişim</span>
              </div>
            </div>
          </div>

          {/* Right Column: Information, Pricing & Interactive Add-to-Cart */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-md bg-surface-panel border border-surface-border text-artisan-gold text-xs font-mono font-medium">
                  {product.category === "bread"
                    ? "EKŞİ MAYALI EKMEK"
                    : product.category === "specialty"
                    ? "ÖZEL SERİ"
                    : "GURME ŞARKÜTERİ"}
                </span>
                {product.hydration && (
                  <span className="px-2.5 py-0.5 rounded-md bg-surface-panel border border-surface-border text-foreground/80 text-xs font-mono">
                    %{product.hydration} Hidrasyon
                  </span>
                )}
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
                {product.name}
              </h1>

              <p className="mt-4 text-sm sm:text-base text-foreground/80 leading-relaxed font-sans">
                {product.description}
              </p>
            </div>

            {/* Client Interactive Add-to-Cart & Stepper */}
            <ProductDetailClientActions product={product} />

            {/* Delivery Guarantee Info Box */}
            <div className="p-4 rounded-2xl bg-surface/50 border border-surface-border space-y-2 text-xs font-sans text-foreground/80">
              <div className="flex items-center gap-2 text-artisan-gold font-bold">
                <Truck className="w-4 h-4" />
                <span>Kendi Fırın Kuryemizle Kapınıza Teslimat</span>
              </div>
              <p className="text-foreground/60 leading-relaxed">
                Beylikdüzü içinde seçtiğiniz gün kapınıza ulaştırıyoruz.{" "}
                <ShippingPolicyNote />.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Artisan DNA Specifications Table */}
        <section className="pt-6 border-t border-surface-border">
          <div className="mb-6">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-artisan-gold" />
              <span>Ürün Kimliği & Zanaat Özellikleri</span>
            </h2>
            <p className="text-xs sm:text-sm text-foreground/60 mt-1 font-sans">
              EkmekLab mutfağında her somunun ardında şeffaf ve tavizsiz bir zanaat yatar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Spec 1: Hydration */}
            <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-1">
              <div className="flex items-center gap-2 text-artisan-gold text-xs font-bold uppercase tracking-wider">
                <Droplets className="w-4 h-4" />
                <span>Hidrasyon (Su Oranı)</span>
              </div>
              <div className="font-mono text-2xl font-bold text-foreground pt-1">
                {product.hydration ? `%${product.hydration}` : "Doğal Kıvam"}
              </div>
              <p className="text-xs text-foreground/60">
                Yüksek su oranı ile yumuşak, geniş gözenekli ve nemli iç doku.
              </p>
            </div>

            {/* Spec 2: Fermentation */}
            <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-1">
              <div className="flex items-center gap-2 text-artisan-gold text-xs font-bold uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>Soğuk Fermantasyon</span>
              </div>
              <div className="font-mono text-2xl font-bold text-foreground pt-1">
                {product.category === "bread" || product.category === "specialty"
                  ? "36 - 40 Saat"
                  : "Geleneksel"}
              </div>
              <p className="text-xs text-foreground/60">
                +4°C'de yavaş olgunlaşma; fitik asit sıfırlanır, gluten yumuşar.
              </p>
            </div>

            {/* Spec 3: Flour Types */}
            <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-1">
              <div className="flex items-center gap-2 text-artisan-gold text-xs font-bold uppercase tracking-wider">
                <Wheat className="w-4 h-4" />
                <span>Un & Tahıl Cinsi</span>
              </div>
              <div className="font-serif text-lg font-bold text-foreground pt-1 truncate">
                {product.flourTypes && product.flourTypes.length > 0
                  ? product.flourTypes.join(", ")
                  : "Atalık Taş Değirmen"}
              </div>
              <p className="text-xs text-foreground/60">
                Ruşeymi ve kepeği ayrıştırılmamış yerli taş değirmen unu.
              </p>
            </div>

            {/* Spec 4: Clean Label */}
            <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-1">
              <div className="flex items-center gap-2 text-artisan-gold text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Temiz İçerik</span>
              </div>
              <div className="font-mono text-2xl font-bold text-emerald-400 pt-1">
                %100 Katkısız
              </div>
              <p className="text-xs text-foreground/60">
                Ticari maya, endüstriyel enzim veya koruyucu kimyasal içermez.
              </p>
            </div>
          </div>

          {/* Ingredients list */}
          {product.ingredients && product.ingredients.length > 0 && (
            <div className="mt-4 p-5 rounded-2xl bg-surface border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-foreground font-serif text-sm font-bold shrink-0">
                <Award className="w-4 h-4 text-artisan-gold" />
                <span>İçindekiler Listesi:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.ingredients.map((ing, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-lg bg-surface-panel border border-surface-border text-foreground/90 font-sans"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 3. Deep Dive Masterclass: Ustanın Notu & Biyoloji */}
        {masterclass && (
          <section className="pt-6 border-t border-surface-border">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 font-serif text-xs font-bold text-artisan-gold uppercase tracking-wider mb-2">
                <BookOpen className="w-4 h-4" />
                <span>USTANIN NOTU & BİYOLOJİ</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                Zanaatın Perde Arkası ve Sağlık Etkisi
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Flour & Yeast Heritage */}
              {masterclass.flourHeritage && (
                <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-3">
                  <div className="flex items-center gap-2.5 text-artisan-gold font-serif font-bold text-base">
                    <Wheat className="w-5 h-5 text-artisan-gold shrink-0" />
                    <span>Unun ve Mayanın Kökeni</span>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-sans">
                    {masterclass.flourHeritage}
                  </p>
                </div>
              )}

              {/* Card 2: Fermentation Technique */}
              {masterclass.technique && (
                <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-3">
                  <div className="flex items-center gap-2.5 text-artisan-gold font-serif font-bold text-base">
                    <Activity className="w-5 h-5 text-artisan-gold shrink-0" />
                    <span>Fermantasyon ve Zanaat Tekniği</span>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-sans">
                    {masterclass.technique}
                  </p>
                </div>
              )}

              {/* Card 4: Pairing & Storage */}
              {masterclass.pairingStorage && (
                <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-3">
                  <div className="flex items-center gap-2.5 text-artisan-terracotta font-serif font-bold text-base">
                    <Sparkles className="w-5 h-5 text-artisan-terracotta shrink-0" />
                    <span>Nasıl Tüketilmeli & Saklanmalı?</span>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-sans">
                    {masterclass.pairingStorage}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 4. Related Products Carousel / Grid */}
        {relatedProducts.length > 0 && (
          <section className="pt-6 border-t border-surface-border space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-2xl font-bold text-foreground">
                  Fırından Birlikte İyi Gidenler
                </h3>
                <p className="text-xs text-foreground/60 font-sans mt-0.5">
                  Bu lezzete eşlik eden diğer ekmeklerimiz ve mandıra gurme seçkisi.
                </p>
              </div>
              <Link
                href="/#ekmekler"
                className="text-xs text-artisan-gold hover:underline font-serif flex items-center gap-1"
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
                  className="group rounded-2xl bg-surface border border-surface-border hover:border-artisan-gold/50 p-4 transition-all duration-300 flex flex-col justify-between space-y-3"
                >
                  <div className="relative h-40 w-full rounded-xl overflow-hidden bg-background">
                    <img
                      src={rel.imageUrl}
                      alt={rel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-95"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-serif font-bold text-sm text-foreground group-hover:text-artisan-gold transition-colors line-clamp-1">
                      {rel.name}
                    </h4>
                    <p className="text-[11px] text-foreground/60 line-clamp-2 mt-1 font-sans">
                      {rel.description}
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between pt-2 border-t border-surface-border">
                    <span className="font-serif font-bold text-base text-foreground">
                      {rel.price} <span className="text-xs text-artisan-gold font-sans font-normal">TL</span>
                    </span>
                    <span className="text-[10px] text-artisan-gold font-sans font-medium group-hover:underline">
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface border border-surface-border hover:border-artisan-gold/50 text-xs font-serif text-artisan-cream transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-artisan-gold" />
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
