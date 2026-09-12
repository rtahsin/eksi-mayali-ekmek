"use client";

import React, { useState} from "react";
import { ExtendedProduct} from "@/hooks/useProducts";
import { useCartStore} from "@/lib/store/useCartStore";
import {
 X,
 ShoppingBag,
 Check,
 Plus,
 Minus,
 Wheat,
 Activity,
 ShieldCheck,
 Sparkles,
 Utensils,
 Play,
 Flame,
 BookOpen,
} from "lucide-react";

interface ProductModalProps {
 product: ExtendedProduct | null;
 onClose: () => void;
}

export function ProductModal({ product, onClose}: ProductModalProps) {
 const [quantity, setQuantity] = useState<number>(1);
 const [isAdded, setIsAdded] = useState<boolean>(false);
 const [activeTab, setActiveTab] = useState<"story" | "health" | "pairing">("story");
 const addItem = useCartStore((state) => state.addItem);

 if (!product) return null;

 const handleAddToCart = () => {
 const success = addItem(product, null, quantity);
 if (success) {
 setIsAdded(true);
 setTimeout(() => {
 setIsAdded(false);
 onClose();
}, 1000);
}
};

 const masterclass = product.masterclass;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/90 animate-fadeIn">
 <div className="relative w-full max-w-3xl rounded-3xl bg-surface border border-surface-border overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[92vh]">
 {/* Close Button */}
 <button
 onClick={onClose}
 className="absolute top-3 right-3 z-30 p-2 rounded-full bg-background/80 text-foreground/70 hover:text-foreground border border-surface-border transition-colors"
 >
 <X className="w-5 h-5" />
 </button>

 {/* Left: Visual / Video Area */}
 <div className="w-full md:w-5/12 relative min-h-[220px] md:min-h-[460px] bg-background overflow-hidden shrink-0 flex flex-col justify-between">
 <img
 src={product.imageUrl}
 alt={product.name}
 className="absolute inset-0 w-full h-full object-cover filter brightness-90"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />

 {/* Top Badge */}
 <div className="relative z-10 p-4 flex flex-wrap gap-2">
 {product.madeToOrder ? (
 <span className="px-3 py-1 rounded-full bg-artisan-terracotta text-foreground text-[11px] font-sans font-bold uppercase shadow">
 Ön Siparişle Üretim
 </span>
 ) : (
 <span className="px-3 py-1 rounded-full bg-emerald-900/90 text-emerald-300 border border-emerald-500/40 text-[11px] font-sans font-bold uppercase shadow">
 Günlük Taze Fırın
 </span>
 )}
 </div>

 {/* Bottom Badge & Video Ready Tag */}
 <div className="relative z-10 p-4 space-y-2">
 <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-background/80 border border-white/10 text-[11px] text-artisan-gold">
 <Play className="w-3 h-3 fill-[#D2B48C]" />
 <span>Ustanın Anlatımı</span>
 </div>

 <div className="text-xs font-serif font-bold text-foreground flex items-center gap-1">
 <span>{product.weight}{product.weightUnit || "g"}</span>
 <span className="text-artisan-gold/50">·</span>
 <span className="text-artisan-gold">{product.price} TL</span>
 </div>
 </div>
 </div>

 {/* Right: Masterclass Story & Deep Details */}
 <div className="p-5 sm:p-7 flex-1 flex flex-col justify-between overflow-y-auto space-y-5 bg-surface">
 <div className="space-y-4">
 <div>
 <div className="text-[11px] font-sans text-artisan-gold font-bold uppercase tracking-wider">
 {product.category === "pantry" ? "ŞARKÜTERİ EŞLİKÇİSİ" : "ARTISAN FIRIN USTASI ANLATIYOR"}
 </div>
 <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-1 leading-snug">
 {product.name}
 </h2>
 <div className="font-serif text-xl font-bold text-artisan-gold mt-1">
 {product.price} <span className="text-sm font-sans font-normal text-foreground/80/70">TL</span>
 </div>
 </div>

 {/* Sub-tabs for deep storytelling */}
 <div className="flex border-b border-surface-border gap-2 pt-1">
 <button
 type="button"
 onClick={() => setActiveTab("story")}
 className={`pb-2 text-xs font-sans font-semibold transition-colors relative ${
 activeTab === "story"
 ? "text-foreground border-b-2 border-[#8B5E3C]"
 : "text-foreground/80/60 hover:text-foreground/80"
}`}
 >
 🌾 Zanaat & Un
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("health")}
 className={`pb-2 text-xs font-sans font-semibold transition-colors relative ${
 activeTab === "health"
 ? "text-foreground border-b-2 border-[#8B5E3C]"
 : "text-foreground/80/60 hover:text-foreground/80"
}`}
 >
 🌱 Sindirim & Sağlık
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("pairing")}
 className={`pb-2 text-xs font-sans font-semibold transition-colors relative ${
 activeTab === "pairing"
 ? "text-foreground border-b-2 border-[#8B5E3C]"
 : "text-foreground/80/60 hover:text-foreground/80"
}`}
 >
 🧀 Tüketim & Saklama
 </button>
 </div>

 {/* Tab 1: Un & Zanaat */}
 {activeTab === "story" && (
 <div className="space-y-3 animate-fadeIn text-xs sm:text-sm text-foreground/80/85 font-sans leading-relaxed">
 <div className="p-3.5 rounded-2xl bg-surface-panel border border-surface-border space-y-1.5">
 <div className="font-bold text-foreground flex items-center gap-1.5 font-serif text-xs">
 <Wheat className="w-3.5 h-3.5 text-artisan-gold" />
 <span>Unun ve Mayanın Kökeni:</span>
 </div>
 <p className="text-xs text-foreground/80/80">
 {masterclass?.flourHeritage || product.description}
 </p>
 </div>

 {masterclass?.technique && (
 <div className="p-3.5 rounded-2xl bg-surface-panel border border-surface-border space-y-1.5">
 <div className="font-bold text-foreground flex items-center gap-1.5 font-serif text-xs">
 <Flame className="w-3.5 h-3.5 text-artisan-gold" />
 <span>Fermantasyon ve Pişirme Tekniği:</span>
 </div>
 <p className="text-xs text-foreground/80/80">
 {masterclass.technique}
 </p>
 </div>
 )}
 </div>
 )}

 {/* Tab 2: Sağlık & Sindirim */}
 {activeTab === "health" && (
 <div className="space-y-3 animate-fadeIn text-xs sm:text-sm text-foreground/80/85 font-sans leading-relaxed">
 <div className="p-4 rounded-2xl bg-surface-panel border border-surface-border space-y-2">
 <div className="font-bold text-emerald-300 flex items-center gap-1.5 font-serif text-xs">
 <ShieldCheck className="w-4 h-4 text-emerald-400" />
 <span>Neden Midede Şişkinlik Yapmaz?</span>
 </div>
 <p className="text-xs text-foreground/80/80">
 {masterclass?.healthBenefit ||
 "36 saatlik soğuk fermantasyon sayesinde gluten ve fitik asit doğal olarak parçalanır, hazmı çok kolaydır."}
 </p>
 </div>

 <div className="text-[11px] text-emerald-400/90 font-sans">
 ✓ Hiçbir ticari maya, koruyucu, kabartıcı veya renklendirici içermez.
 </div>

 {/* Cross-Link to Science Library */}
 <a
 href={`/kutuphane#${product.category === "bread" ? "gluten-proteoliz" : "fitik-asit-mineraller"}`}
 className="p-3.5 rounded-2xl bg-surface border border-artisan-gold/30 hover:border-artisan-gold/60 flex items-center justify-between transition-all group mt-2"
 >
 <div className="flex items-center gap-2.5">
 <div className="p-2 rounded-xl bg-surface-panel border border-surface-border text-artisan-gold">
 <BookOpen className="w-4 h-4" />
 </div>
 <div>
 <div className="font-serif text-xs font-bold text-foreground group-hover:text-artisan-gold transition-colors">
 Bilim & Zanaat Kütüphanesi'nde İnceleyin
 </div>
 <div className="text-[10px] text-foreground/80/60 font-sans">
 Gluten proteolizi ve enzim aktivitesinin akademik temelleri
 </div>
 </div>
 </div>
 <span className="text-xs text-artisan-gold group-hover:translate-x-1 transition-transform font-bold">
 →
 </span>
 </a>
 </div>
 )}

 {/* Tab 3: Tüketim & Saklama */}
 {activeTab === "pairing" && (
 <div className="space-y-3 animate-fadeIn text-xs sm:text-sm text-foreground/80/85 font-sans leading-relaxed">
 <div className="p-4 rounded-2xl bg-surface-panel border border-surface-border space-y-2">
 <div className="font-bold text-foreground flex items-center gap-1.5 font-serif text-xs">
 <Utensils className="w-4 h-4 text-artisan-gold" />
 <span>Nasıl Tüketilmeli & Saklanmalı?</span>
 </div>
 <p className="text-xs text-foreground/80/80">
 {masterclass?.pairingStorage ||
 "Oda sıcaklığında pamuklu bez torbada 5 gün boyunca tazeliğini korur. Dilimleyip dondurucuda 2 ay saklayabilirsiniz."}
 </p>
 </div>
 </div>
 )}
 </div>

 {/* Bottom Add to Cart CTA */}
 <div className="pt-3 border-t border-surface-border flex items-center gap-3">
 <div className="flex items-center rounded-xl bg-surface-panel border border-surface-border overflow-hidden">
 <button
 type="button"
 onClick={() => setQuantity((q) => Math.max(1, q - 1))}
 className="w-9 h-11 flex items-center justify-center text-foreground/80/70 hover:text-foreground hover:bg-surface-elevated transition-colors"
 >
 <Minus className="w-4 h-4" />
 </button>
 <span className="w-9 text-center font-serif text-sm font-bold text-foreground">
 {quantity}
 </span>
 <button
 type="button"
 onClick={() => setQuantity((q) => q + 1)}
 className="w-9 h-11 flex items-center justify-center text-foreground/80/70 hover:text-foreground hover:bg-surface-elevated transition-colors"
 >
 <Plus className="w-4 h-4" />
 </button>
 </div>

 <button
 type="button"
 onClick={handleAddToCart}
 className={`flex-1 h-11 rounded-xl font-sans text-xs font-bold flex items-center justify-center gap-2 transition-all ${
 isAdded
 ? "bg-emerald-600 text-foreground font-bold"
 : "bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground shadow-lg shadow-artisan-terracotta/30 border border-artisan-gold/30"
}`}
 >
 {isAdded ? (
 <>
 <Check className="w-4 h-4" />
 SEPETE EKLENDİ
 </>
 ) : (
 <>
 <ShoppingBag className="w-4 h-4 text-artisan-gold" />
 SEPETE EKLE ({product.price * quantity} TL)
 </>
 )}
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
