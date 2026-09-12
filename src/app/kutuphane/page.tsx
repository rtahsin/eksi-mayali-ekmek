"use client";

import React, { useState} from "react";
import { Navbar} from "@/components/common/Navbar";
import { Footer} from "@/components/common/Footer";
import { CartDrawer} from "@/components/cart/CartDrawer";
import { OrderSuccessModal} from "@/components/cart/OrderSuccessModal";
import { useJournal} from "@/hooks/useJournal";
import { ArrowRight, Edit3} from "lucide-react";

export default function LibraryIndexPage() {
 const { articles} = useJournal();
 const [selectedFilter, setSelectedFilter] = useState<string>("all");

 const filteredArticles =
 selectedFilter === "all"
 ? articles
 : articles.filter((a) => a.category === selectedFilter);

 const leadArticle = filteredArticles[0] || articles[0];
 const secondaryArticles = filteredArticles.length > 1 ? filteredArticles.slice(1) : [];

 return (
 <div className="min-h-screen flex flex-col bg-background text-foreground/80 font-sans selection:bg-artisan-terracotta/30 selection:text-artisan-gold relative overflow-hidden">
 {/* 1. Atmospheric Photographic Background Image (Zanaat Tezgâhı & Taş Fırın Dokusu) */}
 <div
 className="fixed inset-0 pointer-events-none opacity-30 filter contrast-125 brightness-90 bg-cover bg-center"
 style={{
 backgroundImage: "url('/atelier/atelier_panorama.png')",
}}
 />
 {/* Warm Hearth Ambient Vignette & Contrast Gradients for Deep Readability */}
 <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-[#14100D]/85 via-[#16120E]/80 to-[#14100D]/90" />
 <div
 className="fixed inset-0 pointer-events-none opacity-50"
 style={{
 backgroundImage:
 "radial-gradient(circle at 50% 10%, rgba(139, 94, 60, 0.22) 0%, transparent 60%), radial-gradient(circle at 50% 90%, rgba(139, 94, 60, 0.15) 0%, transparent 70%)",
}}
 />

 {/* 2. Navbar */}
 <Navbar />

 <main className="relative z-10 flex-1 max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-16 space-y-12 sm:space-y-14 w-full">
 {/* Archival Journal Masthead (Gazete/Dergi Künyesi) */}
 <header className="space-y-4 border-b-2 border-surface-border pb-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono tracking-widest uppercase text-artisan-gold gap-2">
 <span>EKMEKLAB · ZANAAT & BİLİM BÜLTENİ</span>
 <div className="flex items-center gap-3">
 <span className="text-foreground/80/60">GÜZ 2026 · CİLT I & II</span>
 <a
 href="/kutuphane/yonetim"
 className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-surface-border text-artisan-gold hover:text-foreground hover:border-[#D2B48C] hover:bg-[#1A140F] transition-all"
 title="Sayı Ekle / Çıkar / Düzenle"
 >
 <Edit3 className="w-3 h-3" />
 <span>Yazı Masası</span>
 </a>
 </div>
 </div>

 <div className="space-y-2 pt-1">
 {/* Scaled-down dignified masthead title */}
 <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground leading-snug">
 Unun, Sütün ve Zamanın Biyokimyası.
 </h1>
 <p className="font-serif text-base sm:text-lg text-artisan-gold italic max-w-3xl">
 "Gıdanın hücresel kökenine inen, zanaatkârın tezgâhı ile bilimin kesiştiği bağımsız araştırma bülteni."
 </p>
 </div>

 {/* Minimal Category Filter Tabs */}
 <div className="flex items-center gap-6 pt-3 border-t border-[#2A2017] text-xs font-mono uppercase tracking-wider text-foreground/80/70">
 <button
 type="button"
 onClick={() => setSelectedFilter("all")}
 className={`pb-1 transition-colors ${
 selectedFilter === "all"
 ? "text-foreground font-bold border-b-2 border-[#D2B48C]"
 : "hover:text-foreground"
}`}
 >
 Tüm Sayılar
 </button>
 <button
 type="button"
 onClick={() => setSelectedFilter("tahil")}
 className={`pb-1 transition-colors ${
 selectedFilter === "tahil"
 ? "text-foreground font-bold border-b-2 border-[#D2B48C]"
 : "hover:text-foreground"
}`}
 >
 Tahıl & Ekmek
 </button>
 <button
 type="button"
 onClick={() => setSelectedFilter("mandira")}
 className={`pb-1 transition-colors ${
 selectedFilter === "mandira"
 ? "text-foreground font-bold border-b-2 border-[#D2B48C]"
 : "hover:text-foreground"
}`}
 >
 Mandıra & Şarküteri
 </button>
 </div>
 </header>

 {/* 3. Featured Lead Essay (Kutusuz, Dergi Manşeti Düzeni) */}
 {leadArticle && (selectedFilter === "all" || selectedFilter === leadArticle.category) && (
 <section className="space-y-5 pb-10 border-b border-[#2A2017]">
 <div className="flex items-center gap-3 text-[11px] font-mono text-artisan-gold uppercase tracking-wider font-semibold">
 <span>BAŞYAZI / ÖNE ÇIKAN ARAŞTIRMA</span>
 <span>·</span>
 <span>{leadArticle.readingTimeMinutes} DK OKUMA</span>
 </div>

 <div className="space-y-1.5">
 {/* Scaled-down dignified lead title */}
 <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl font-semibold text-foreground tracking-tight leading-snug hover:text-artisan-gold transition-colors">
 <a href={`/kutuphane/${leadArticle.slug}`}>{leadArticle.title}</a>
 </h2>
 <p className="font-serif text-sm sm:text-base text-artisan-gold italic">
 "{leadArticle.subtitle}"
 </p>
 </div>

 <p className="font-serif text-base text-foreground/80/90 leading-relaxed max-w-3xl">
 {leadArticle.thirtySecondTakeaway}
 </p>

 <div>
 <a
 href={`/kutuphane/${leadArticle.slug}`}
 className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-artisan-gold font-bold hover:text-foreground transition-colors border-b border-[#D2B48C] pb-0.5"
 >
 <span>Yazının Tamamını Oku (Anatomi Gravürü & Video)</span>
 <ArrowRight className="w-3.5 h-3.5" />
 </a>
 </div>
 </section>
 )}

 {/* 4. Table of Secondary Essays (Kitap İçindekiler Düzeni) */}
 <section className="space-y-6">
 <div className="text-[11px] font-mono uppercase tracking-widest text-artisan-gold font-semibold">
 YAYINLANAN DİĞER DOSYALAR
 </div>

 <div className="divide-y divide-[#2A2017]">
 {secondaryArticles.map((art) => (
 <article key={art.id} className="py-7 space-y-2.5 first:pt-0 group">
 <div className="flex items-center justify-between text-[11px] font-mono text-foreground/80/60">
 <span className="uppercase tracking-wider text-artisan-gold font-semibold">
 {art.categoryLabel}
 </span>
 <span>{art.readingTimeMinutes} Dk Okuma · {art.publishedDate}</span>
 </div>

 {/* Scaled-down dignified secondary title */}
 <h3 className="font-serif text-lg sm:text-xl font-semibold text-foreground group-hover:text-artisan-gold transition-colors leading-snug">
 <a href={`/kutuphane/${art.slug}`}>{art.title}</a>
 </h3>

 <p className="font-serif text-xs sm:text-sm text-artisan-gold italic">
 "{art.subtitle}"
 </p>

 <p className="font-serif text-sm text-foreground/80/85 leading-relaxed max-w-2xl line-clamp-2">
 {art.thirtySecondTakeaway}
 </p>

 <div className="pt-1">
 <a
 href={`/kutuphane/${art.slug}`}
 className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-foreground font-bold group-hover:text-artisan-gold transition-colors"
 >
 <span>İncele ve Oku</span>
 <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
 </a>
 </div>
 </article>
 ))}

 {/* Forthcoming Research Note */}
 <div className="py-7 space-y-2 opacity-55 text-left">
 <div className="text-[10px] font-mono uppercase tracking-widest text-artisan-gold/70">
 CİLT III · YAKINDA
 </div>
 <h4 className="font-serif text-base sm:text-lg font-semibold text-foreground">
 Ateş, Kolajen ve Doymuş Yağların Biyolojisi
 </h4>
 <p className="font-serif text-xs sm:text-sm text-artisan-gold italic">
 "Taş Fırın Dana Kavurma ve Yayık Tereyağında Yağ Asitleri"
 </p>
 <p className="text-xs font-serif text-foreground/80/60 pt-0.5">
 Yazı taslağı ve laboratuvar notları zanaat masasında hazırlanıyor...
 </p>
 </div>
 </div>
 </section>

 {/* 5. Minimalist Storefront Signpost */}
 <footer className="pt-10 border-t-2 border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
 <div className="space-y-0.5">
 <div className="font-serif text-base font-bold text-foreground">
 EkmekLab Taş Fırın & Şarküteri
 </div>
 <div className="text-xs font-serif text-foreground/80/60">
 Beylikdüzü'nde günlük taş fırın çıkışı ve doğal şarküteri lezzetleri.
 </div>
 </div>

 <a
 href="/#ekmekler"
 className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#D2B48C]/50 font-mono text-xs uppercase tracking-wider text-foreground hover:bg-artisan-terracotta hover:border-[#8B5E3C] transition-all"
 >
 <span>Taze Ürünleri Gör →</span>
 </a>
 </footer>
 </main>

 {/* 6. Footer & Cart Drawer */}
 <Footer />
 <CartDrawer />
 <OrderSuccessModal />
 </div>
 );
}
