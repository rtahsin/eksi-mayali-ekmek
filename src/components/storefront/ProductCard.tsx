"use client";

import React, { useState} from "react";
import { ExtendedProduct} from "@/hooks/useProducts";
import { useCartStore} from "@/lib/store/useCartStore";
import { ShoppingBag, Plus, Minus, Check, BookOpen} from "lucide-react";

interface ProductCardProps {
 product: ExtendedProduct;
 onOpenDetails: (product: ExtendedProduct) => void;
}

export function ProductCard({ product, onOpenDetails}: ProductCardProps) {
 const [quantity, setQuantity] = useState<number>(1);
 const [isAdded, setIsAdded] = useState<boolean>(false);
 const addItem = useCartStore((state) => state.addItem);

 const handleIncrement = (e: React.MouseEvent) => {
 e.stopPropagation();
 setQuantity((prev) => prev + 1);
};

 const handleDecrement = (e: React.MouseEvent) => {
 e.stopPropagation();
 if (quantity > 1) {
 setQuantity((prev) => prev - 1);
}
};

 const handleAddToCart = (e: React.MouseEvent) => {
 e.stopPropagation();
 const success = addItem(product, null, quantity);
 if (success) {
 setIsAdded(true);
 setTimeout(() => setIsAdded(false), 1200);
}
};

 return (
 <div
 onClick={() => onOpenDetails(product)}
 className="group cursor-pointer rounded-2xl bg-surface border border-surface-border hover:border-artisan-gold/60 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-lg hover:shadow-2xl"
 >
 {/* Product Image */}
 <div className="relative h-56 w-full bg-background overflow-hidden">
 <img
 src={product.imageUrl}
 alt={product.name}
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-95"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-85" />

 {/* Top Badges */}
 <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
 {product.madeToOrder ? (
 <span className="px-2.5 py-0.5 rounded-full bg-artisan-terracotta text-foreground text-[10px] font-sans font-bold uppercase shadow-sm">
 Ön Sipariş
 </span>
 ) : (
 <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/90 text-emerald-300 border border-emerald-500/40 text-[10px] font-sans font-bold uppercase shadow-sm">
 Günlük Taze
 </span>
 )}

 {product.isPopular && (
 <span className="px-2.5 py-0.5 rounded-full bg-[#D2B48C] text-stone-950 text-[10px] font-sans font-bold uppercase shadow-sm">
 Öne Çıkan
 </span>
 )}
 </div>

        {/* Weight / Volume Tag */}
        <div className="absolute bottom-3 right-3 text-[11px] font-sans text-foreground px-2.5 py-0.5 rounded-md bg-surface/90 border border-surface-border font-mono">
          {product.weight >= 1000 && product.weightUnit === "ml"
            ? `${product.weight / 1000} Litre`
            : `${product.weight}${product.weightUnit || "g"}`}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif font-bold text-foreground text-base leading-snug group-hover:text-artisan-gold transition-colors">
              {product.name}
            </h3>
          </div>

          <p className="text-xs text-foreground/80/70 line-clamp-2 mt-1.5 font-sans leading-relaxed">
            {product.description}
          </p>

          {/* Artisan DNA Pills */}
          <div className="pt-1.5 flex flex-wrap gap-1.5 text-[10px] font-sans">
            {product.hydration && (
              <span className="px-2 py-0.5 rounded-md bg-surface-panel border border-surface-border text-artisan-gold font-mono">
                %{product.hydration} Su
              </span>
            )}
            {product.category === "bread" || product.category === "specialty" ? (
              <span className="px-2 py-0.5 rounded-md bg-surface-panel border border-surface-border text-foreground/80 font-mono">
                36s Soğuk Fermantasyon
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-surface-panel border border-surface-border text-emerald-400/90 font-sans">
                %100 Doğal & Katkısız
              </span>
            )}
            {product.flourTypes && product.flourTypes.length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-surface-panel border border-surface-border text-artisan-terracotta font-sans font-medium">
                {product.flourTypes[0].split(" ")[0]}
              </span>
            )}
          </div>

            {/* Masterclass & Health Note Prompt */}
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-panel/80 group-hover:bg-surface-elevated text-[11px] text-artisan-gold border border-artisan-gold/20 font-sans font-medium group-hover:border-artisan-gold/50 transition-all">
                <BookOpen className="w-3.5 h-3.5 text-artisan-gold shrink-0" />
                <span>Ustanın Notu: Zanaat & Biyoloji →</span>
              </span>
            </div>
          </div>

 {/* Bottom Price & Add Actions */}
 <div className="pt-3 border-t border-surface-border space-y-3">
 <div className="flex items-baseline justify-between">
 <span className="text-xs font-sans text-foreground/80/60">Fiyat</span>
 <div className="font-serif text-xl font-bold text-foreground">
 {product.price}{" "}
 <span className="text-xs text-artisan-gold font-normal font-sans">TL</span>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {/* Stepper */}
 <div className="flex items-center rounded-xl bg-surface-panel border border-surface-border overflow-hidden">
 <button
 type="button"
 onClick={handleDecrement}
 disabled={quantity <= 1}
 className="w-8 h-9 flex items-center justify-center text-foreground/80/70 hover:text-foreground hover:bg-surface-elevated transition-colors disabled:opacity-30"
 >
 <Minus className="w-3.5 h-3.5" />
 </button>
 <span className="w-8 text-center font-sans text-xs font-bold text-foreground">
 {quantity}
 </span>
 <button
 type="button"
 onClick={handleIncrement}
 className="w-8 h-9 flex items-center justify-center text-foreground/80/70 hover:text-foreground hover:bg-surface-elevated transition-colors"
 >
 <Plus className="w-3.5 h-3.5" />
 </button>
 </div>

 {/* Add Button */}
 <button
 type="button"
 onClick={handleAddToCart}
 className={`flex-1 h-9 rounded-xl font-sans text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
 isAdded
 ? "bg-emerald-600 text-foreground font-bold shadow-md"
 : "bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground shadow-md shadow-[#8B5E3C]/20 border border-artisan-gold/30"
}`}
 >
 {isAdded ? (
 <>
 <Check className="w-4 h-4" />
 EKLENDİ
 </>
 ) : (
 <>
 <ShoppingBag className="w-4 h-4 text-artisan-gold" />
 SEPETE EKLE
 </>
 )}
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
