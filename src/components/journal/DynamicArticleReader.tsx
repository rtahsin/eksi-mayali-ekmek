"use client";

import React from "react";
import { useJournal} from "@/hooks/useJournal";
import { JournalArticle} from "@/types/journal";
import { EditorialArticleView} from "./EditorialArticleView";
import { Navbar} from "@/components/common/Navbar";
import { Footer} from "@/components/common/Footer";
import { CartDrawer} from "@/components/cart/CartDrawer";
import { OrderSuccessModal} from "@/components/cart/OrderSuccessModal";
import { ArrowLeft, BookOpen} from "lucide-react";

interface DynamicArticleReaderProps {
 initialArticle?: JournalArticle;
 slug: string;
}

export function DynamicArticleReader({ initialArticle, slug}: DynamicArticleReaderProps) {
 const { getArticleBySlug, loading} = useJournal();

 // Try to find dynamically updated or client-stored article
 const article = getArticleBySlug(slug) || initialArticle;

 if (!article && !loading) {
 return (
 <div className="min-h-screen flex flex-col bg-background text-foreground">
 <Navbar />
 <main className="flex-1 max-w-xl mx-auto px-6 py-24 text-center space-y-6">
 <div className="w-16 h-16 rounded-full bg-[#2A2017] border border-surface-border flex items-center justify-center mx-auto text-artisan-gold">
 <BookOpen className="w-8 h-8" />
 </div>
 <div className="space-y-2">
 <h1 className="font-serif text-2xl font-bold text-foreground">Sayı Henüz Yayında Değil</h1>
 <p className="font-serif text-sm text-artisan-gold italic">
 Aradığınız araştırma dosyası veya sayı henüz kütüphaneye eklenmemiş ya da taslak aşamasında olabilir.
 </p>
 </div>
 <div>
 <a
 href="/kutuphane"
 className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-artisan-terracotta text-foreground text-xs font-mono uppercase tracking-wider font-bold hover:bg-[#A06D46] transition-colors"
 >
 <ArrowLeft className="w-4 h-4" />
 <span>Kütüphane Fihristine Dön</span>
 </a>
 </div>
 </main>
 <Footer />
 </div>
 );
}

 if (!article) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-background text-artisan-gold font-mono text-xs uppercase tracking-widest">
 Araştırma Dosyası Açılıyor...
 </div>
 );
}

 return (
 <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-artisan-terracotta/30 selection:text-artisan-gold">
 <Navbar />
 <div className="flex-1">
 <EditorialArticleView article={article} />
 </div>
 <Footer />
 <CartDrawer />
 <OrderSuccessModal />
 </div>
 );
}
