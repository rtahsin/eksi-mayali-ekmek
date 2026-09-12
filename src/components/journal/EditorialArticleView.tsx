"use client";

import React, { useState, useEffect} from "react";
import { JournalArticle} from "@/types/journal";
import { useProducts} from "@/hooks/useProducts";
import { useCartStore} from "@/lib/store/useCartStore";
import { BotanicalDiagram} from "./BotanicalDiagram";
import { VideoFacadeCard} from "./VideoFacadeCard";
import {
 Clock,
 ShoppingBag,
 Check,
 Plus,
 Minus,
 ExternalLink,
 ChevronRight,
 Sparkles,
 Share2,
 MessageSquare,
} from "lucide-react";

interface EditorialArticleViewProps {
 article: JournalArticle;
}

export function EditorialArticleView({ article}: EditorialArticleViewProps) {
 const [readingProgress, setReadingProgress] = useState<number>(0);
 const [quantity, setQuantity] = useState<number>(1);
 const [isAdded, setIsAdded] = useState<boolean>(false);
 const [copied, setCopied] = useState<boolean>(false);

 const { allProducts} = useProducts();
 const addItem = useCartStore((state) => state.addItem);

 const relatedProduct =
 allProducts.find((p) => p.id === article.relatedProductId) || allProducts[0];

 useEffect(() => {
 const handleScroll = () => {
 const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
 if (totalHeight > 0) {
 const current = (window.scrollY / totalHeight) * 100;
 setReadingProgress(Math.min(100, Math.max(0, current)));
}
};
 window.addEventListener("scroll", handleScroll, { passive: true});
 return () => window.removeEventListener("scroll", handleScroll);
}, []);

 const handleAddToCart = () => {
 if (relatedProduct) {
 addItem(relatedProduct, null, quantity);
 setIsAdded(true);
 setTimeout(() => setIsAdded(false), 1500);
}
};

 return (
 <div className="relative w-full min-h-screen bg-background text-foreground/80 overflow-hidden">
 {/* 1. Atmospheric Photographic Background Image (Sıcak Zanaat Tezgâhı Dokusu) */}
 <div
 className="fixed inset-0 pointer-events-none opacity-30 filter contrast-125 brightness-90 bg-cover bg-center"
 style={{
 backgroundImage: "url('/atelier/atelier_panorama.png')",
}}
 />
 {/* Soft Hearth Ambient Vignette & Darkness Layer for Crystal-Clear Readability */}
 <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-[#14100D]/85 via-[#16120E]/80 to-[#14100D]/90" />
 <div
 className="fixed inset-0 pointer-events-none opacity-50"
 style={{
 backgroundImage:
 "radial-gradient(circle at 50% 10%, rgba(139, 94, 60, 0.22) 0%, transparent 60%), radial-gradient(circle at 50% 90%, rgba(139, 94, 60, 0.15) 0%, transparent 70%)",
}}
 />

 {/* Hairline Reading Progress */}
 <div className="fixed top-0 left-0 w-full h-0.5 bg-surface-panel z-50">
 <div
 className="h-full bg-[#D2B48C] transition-all duration-150 shadow-[0_0_8px_rgba(210,180,140,0.5)]"
 style={{ width: `${readingProgress}%`}}
 />
 </div>

 {/* 2. Paper Editorial Content Sheet */}
 <main className="relative z-10 max-w-2xl mx-auto px-5 sm:px-8 py-12 sm:py-16 space-y-10 sm:space-y-12">
 {/* Navigation Masthead */}
 <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-artisan-gold border-b border-surface-border pb-3">
 <a href="/kutuphane" className="hover:text-foreground transition-colors flex items-center gap-1.5">
 ← Zanaat & Bilim Bülteni
 </a>
 <span className="text-foreground/80/70">
 {article.categoryLabel} · {article.readingTimeMinutes} Dk Okuma
 </span>
 </div>

 {/* Scaled-Down Dignified Editorial Headline */}
 <header className="space-y-2.5 pt-1">
 <div className="text-[11px] font-mono tracking-widest text-artisan-gold uppercase font-semibold">
 {article.volumeTitle}
 </div>

 {/* Scaled down to dignified text-xl sm:text-2xl lg:text-3xl */}
 <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl font-semibold text-foreground tracking-normal leading-snug">
 {article.title}
 </h1>

 <p className="font-serif text-sm sm:text-base text-artisan-gold italic leading-relaxed">
 "{article.subtitle}"
 </p>

 <div className="text-xs text-foreground/80/60 font-mono pt-1">
 Yayın: {article.publishedDate} · EkmekLab Araştırma Masası
 </div>
 </header>

 {/* 3. "30 Saniyede Özet" (Kutusuz, altın-amber sol ayraçlı editoryal alıntı) */}
 <aside className="my-8 pl-5 sm:pl-6 border-l-2 border-[#D2B48C] py-1.5">
 <div className="text-[10px] font-mono uppercase tracking-widest text-artisan-gold font-bold mb-1.5 flex items-center gap-1.5">
 <Sparkles className="w-3 h-3" />
 <span>30 Saniyede Özet (Hap Bilgi)</span>
 </div>
 <p className="font-serif italic text-base sm:text-lg text-foreground leading-relaxed">
 "{article.thirtySecondTakeaway}"
 </p>
 </aside>

 {/* 4. Reading Body */}
 <article className="space-y-6 text-foreground/80/90 font-serif text-base sm:text-lg leading-[1.9] tracking-normal">
 {/* Lead Paragraph with Authentic Drop Cap */}
 <p className="first-letter:font-serif first-letter:text-5xl sm:first-letter:text-6xl first-letter:font-bold first-letter:text-artisan-gold first-letter:mr-3 first-letter:float-left first-letter:leading-none">
 {article.dropCapLetter}
 {article.leadParagraph}
 </p>

 {/* Sections with scaled-down headings */}
 {article.sections.map((section) => (
 <section key={section.id} id={section.id} className="space-y-5 pt-4">
 {/* Scaled down to dignified text-lg sm:text-xl */}
 <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground pt-5 border-t border-surface-border">
 {section.heading}
 </h2>

 {section.paragraphs.map((p, pIdx) => (
 <p key={pIdx}>{p}</p>
 ))}

 {/* Pull Quote */}
 {section.pullQuote && (
 <blockquote className="my-8 py-5 border-y border-surface-border text-center font-serif text-lg sm:text-xl text-foreground italic leading-relaxed px-4">
 {section.pullQuote}
 </blockquote>
 )}

 {/* Botanical Vector Diagram */}
 {section.diagram && <BotanicalDiagram diagram={section.diagram} />}

 {/* Video Facade Player */}
 {section.video && <VideoFacadeCard video={section.video} />}

 {/* Practical Tips (Unboxed, pure editorial rule) */}
 {section.practicalTips && (
 <div className="my-6 pl-5 sm:pl-6 border-l-2 border-[#D2B48C]/70 py-2 space-y-2">
 <div className="font-mono text-xs uppercase tracking-wider text-artisan-gold font-bold">
 💡 Pratik Mutfak Notları:
 </div>
 <ul className="space-y-1.5 text-xs sm:text-sm font-sans text-foreground/80/90">
 {section.practicalTips.map((tip, tIdx) => (
 <li key={tIdx} className="flex items-start gap-2">
 <span className="text-artisan-gold font-bold">―</span>
 <span>{tip}</span>
 </li>
 ))}
 </ul>
 </div>
 )}
 </section>
 ))}
 </article>

 {/* 5. Academic Footnotes / References */}
 {article.citations.length > 0 && (
 <footer className="pt-8 border-t border-surface-border space-y-3">
 <div className="text-[11px] font-mono uppercase tracking-widest text-artisan-gold font-bold">
 Akademik Kaynakça & Hakemli Literatür
 </div>

 <ol className="list-decimal list-inside space-y-2.5 text-xs font-sans text-foreground/80/75 leading-relaxed">
 {article.citations.map((c, idx) => (
 <li key={idx} className="space-y-0.5">
 <span className="text-foreground font-medium">
 {c.authors} ({c.year}). <em>"{c.title}"</em>. <span className="text-artisan-gold">{c.journal}</span>.
 </span>
 <div className="text-[11px] text-foreground/80/70 pl-4">
 💡 Bulgu: {c.finding}
 </div>
 {c.doi && (
 <div className="pl-4">
 <a
 href={c.doi}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 text-[10px] text-artisan-gold hover:text-foreground pt-0.5"
 >
 <ExternalLink className="w-2.5 h-2.5" />
 <span>Akademik Yayına Git (DOI)</span>
 </a>
 </div>
 )}
 </li>
 ))}
 </ol>
 </footer>
 )}

 {/* 6. Share & Recommend Bar (Zanaat Bülteni Tavsiye Köprüsü) */}
 <div className="pt-6 pb-2 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
 <div className="text-artisan-gold/90 flex items-center gap-2">
 <span>Bu araştırmayı paylaşın:</span>
 </div>

 <div className="flex items-center gap-2.5">
 <a
 href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
 `"${article.title}" - EkmekLab Bilim & Zanaat Araştırması: https://ekmeklab.com/kutuphane/${article.slug}`
 )}`}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
 >
 <MessageSquare className="w-3.5 h-3.5" />
 <span>WhatsApp'ta Paylaş</span>
 </a>

 <button
 type="button"
 onClick={() => {
 if (typeof window !== "undefined") {
 navigator.clipboard.writeText(window.location.href);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
}
}}
 className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-surface-border text-foreground/80/75 hover:text-foreground hover:border-[#D2B48C] transition-colors"
 >
 {copied ? (
 <>
 <Check className="w-3.5 h-3.5 text-emerald-400" />
 <span className="text-emerald-400">Kopyalandı</span>
 </>
 ) : (
 <>
 <Share2 className="w-3.5 h-3.5" />
 <span>Bağlantıyı Kopyala</span>
 </>
 )}
 </button>
 </div>
 </div>

 {/* 7. Commercial Bridge (Kutusuz, zarif mühür kapanışı) */}
 {relatedProduct && (
 <div className="my-10 py-7 border-y-2 border-artisan-gold/40 flex flex-col sm:flex-row items-center justify-between gap-5">
 <div className="space-y-1 text-center sm:text-left">
 <div className="text-[10px] font-mono uppercase tracking-widest text-artisan-gold">
 Bu Yazıda Bahsedilen Zanaat Reçetesi
 </div>
 <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
 {relatedProduct.name}
 </h3>
 <p className="font-serif text-xs sm:text-sm text-artisan-gold">
 {relatedProduct.price} TL · {relatedProduct.weight}g (Taş Fırın Çıkışı)
 </p>
 </div>

 <div className="flex items-center gap-3 shrink-0">
 <div className="flex items-center border border-surface-border bg-surface rounded-xl overflow-hidden">
 <button
 type="button"
 onClick={() => setQuantity((q) => Math.max(1, q - 1))}
 className="w-8 h-9 flex items-center justify-center hover:bg-surface-panel text-foreground/80"
 >
 <Minus className="w-3.5 h-3.5" />
 </button>
 <span className="w-8 text-center font-mono text-xs font-bold text-foreground">
 {quantity}
 </span>
 <button
 type="button"
 onClick={() => setQuantity((q) => q + 1)}
 className="w-8 h-9 flex items-center justify-center hover:bg-surface-panel text-foreground/80"
 >
 <Plus className="w-3.5 h-3.5" />
 </button>
 </div>

 <button
 type="button"
 onClick={handleAddToCart}
 className={`px-5 py-2.5 rounded-xl font-sans text-xs font-bold flex items-center gap-2 transition-all ${
 isAdded
 ? "bg-emerald-600 text-foreground shadow-lg"
 : "bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground shadow-lg shadow-artisan-terracotta/30 border border-artisan-gold/30"
}`}
 >
 {isAdded ? (
 <>
 <Check className="w-3.5 h-3.5" />
 <span>Eklendi</span>
 </>
 ) : (
 <>
 <ShoppingBag className="w-3.5 h-3.5 text-artisan-gold" />
 <span>Sofranıza İsteyin</span>
 </>
 )}
 </button>
 </div>
 </div>
 )}

 {/* 7. Next Article Link */}
 {article.nextArticle && (
 <div className="pt-4 flex items-center justify-between text-xs font-mono">
 <a href="/kutuphane" className="text-foreground/80/60 hover:text-artisan-gold transition-colors">
 ← Tüm Sayılar
 </a>

 <a
 href={`/kutuphane/${article.nextArticle.slug}`}
 className="text-right group"
 >
 <div className="text-artisan-gold uppercase">Sıradaki Yazı →</div>
 <div className="font-serif text-sm font-bold text-foreground group-hover:text-artisan-gold transition-colors mt-0.5">
 {article.nextArticle.title}
 </div>
 </a>
 </div>
 )}
 </main>
 </div>
 );
}
