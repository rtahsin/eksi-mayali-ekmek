"use client";

import React, { useState} from "react";
import { useJournal} from "@/hooks/useJournal";
import { useProducts} from "@/hooks/useProducts";
import { JournalArticle, JournalSection, JournalCitation, JournalCategory} from "@/types/journal";
import { Navbar} from "@/components/common/Navbar";
import { Footer} from "@/components/common/Footer";
import {
 Plus,
 Trash2,
 Edit3,
 ExternalLink,
 ArrowLeft,
 Save,
 Check,
 RefreshCw,
 BookOpen,
 Sparkles,
 Layers,
 FileText,
 AlertCircle,
} from "lucide-react";

const EMPTY_SECTION: JournalSection = {
 id: "bolum-1",
 heading: "",
 paragraphs: [""],
 pullQuote: "",
 practicalTips: [],
};

const EMPTY_ARTICLE: JournalArticle = {
 id: "",
 slug: "",
 volumeNumber: 1,
 volumeTitle: "Cilt III: Zanaat Masası",
 category: "tahil",
 categoryLabel: "Tahıl & Ekmek",
 title: "",
 subtitle: "",
 publishedDate: "Ekim 2026",
 readingTimeMinutes: 4,
 thirtySecondTakeaway: "",
 dropCapLetter: "B",
 leadParagraph: "",
 sections: [{ ...EMPTY_SECTION}],
 citations: [],
 relatedProductId: "",
};

export default function JournalAdminPage() {
 const { articles, saveArticle, deleteArticle, resetToDefaults} = useJournal();
 const { allProducts} = useProducts();

 const [mode, setMode] = useState<"list" | "edit">("list");
 const [formData, setFormData] = useState<JournalArticle>(EMPTY_ARTICLE);
 const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
 const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

 // Start new article
 const handleStartNew = () => {
 const nextVolume = articles.length + 1;
 setFormData({
 ...EMPTY_ARTICLE,
 id: `art_${Date.now()}`,
 volumeNumber: nextVolume,
 volumeTitle: `Cilt ${nextVolume}: Yeni Araştırma Dosyası`,
 relatedProductId: allProducts[0]?.id || "",
});
 setMode("edit");
};

 // Start edit existing
 const handleEdit = (article: JournalArticle) => {
 setFormData(JSON.parse(JSON.stringify(article)));
 setMode("edit");
};

 // Auto-generate slug from title if empty
 const handleTitleChange = (val: string) => {
 const slugified = val
 .toLowerCase()
 .trim()
 .replace(/ğ/g, "g")
 .replace(/ü/g, "u")
 .replace(/ş/g, "s")
 .replace(/ı/g, "i")
 .replace(/ö/g, "o")
 .replace(/ç/g, "c")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/^-+|-+$/g, "");

 setFormData((prev) => ({
 ...prev,
 title: val,
 slug: prev.slug && prev.slug !== "" ? prev.slug : slugified,
}));
};

 // Save handler
 const handleSave = (e: React.FormEvent) => {
 e.preventDefault();
 if (!formData.title.trim()) {
 alert("Lütfen makale başlığını giriniz.");
 return;
}
 if (!formData.slug.trim()) {
 alert("Lütfen bir URL anahtarı (slug) giriniz.");
 return;
}

 const articleToSave: JournalArticle = {
 ...formData,
 id: formData.id || `art_${Date.now()}`,
 dropCapLetter: formData.dropCapLetter || formData.leadParagraph.charAt(0) || "B",
 relatedProductId: formData.relatedProductId || allProducts[0]?.id || "",
};

 saveArticle(articleToSave);
 setSaveSuccess(true);
 setTimeout(() => {
 setSaveSuccess(false);
 setMode("list");
}, 900);
};

 // Section helpers
 const handleAddSection = () => {
 setFormData((prev) => ({
 ...prev,
 sections: [
 ...prev.sections,
 {
 ...EMPTY_SECTION,
 id: `bolum-${prev.sections.length + 1}`,
 heading: `${prev.sections.length + 1}. `,
},
],
}));
};

 const handleRemoveSection = (index: number) => {
 setFormData((prev) => ({
 ...prev,
 sections: prev.sections.filter((_, i) => i !== index),
}));
};

 const handleSectionHeadingChange = (index: number, val: string) => {
 setFormData((prev) => {
 const nextSections = [...prev.sections];
 nextSections[index].heading = val;
 return { ...prev, sections: nextSections};
});
};

 const handleSectionParagraphsChange = (index: number, val: string) => {
 const paragraphs = val.split("\n\n").map((p) => p.trim()).filter(Boolean);
 setFormData((prev) => {
 const nextSections = [...prev.sections];
 nextSections[index].paragraphs = paragraphs.length > 0 ? paragraphs : [""];
 return { ...prev, sections: nextSections};
});
};

 const handleSectionPullQuoteChange = (index: number, val: string) => {
 setFormData((prev) => {
 const nextSections = [...prev.sections];
 nextSections[index].pullQuote = val;
 return { ...prev, sections: nextSections};
});
};

 const handleSectionDiagramChange = (
 index: number,
 diagramType: "none" | "wheat_anatomy" | "dairy_fermentation"
 ) => {
 setFormData((prev) => {
 const nextSections = [...prev.sections];
 if (diagramType === "none") {
 delete nextSections[index].diagram;
} else if (diagramType === "wheat_anatomy") {
 nextSections[index].diagram = {
 type: "wheat_anatomy",
 caption: "Ata tohumu buğday tanesinin katmanları: Kepek, Ruşeym ve Endosperm.",
 altText: "Buğday anatomisi gravürü",
};
} else {
 nextSections[index].diagram = {
 type: "dairy_fermentation",
 caption: "Çiğ sütte mikrobiyolojik dönüşüm: Kazein pıhtısı ve canlı flora dengesi.",
 altText: "Süt fermantasyon diyagramı",
};
}
 return { ...prev, sections: nextSections};
});
};

 // Citation helpers
 const handleAddCitation = () => {
 const newCitation: JournalCitation = {
 authors: "",
 year: new Date().getFullYear(),
 title: "",
 journal: "",
 finding: "",
};
 setFormData((prev) => ({
 ...prev,
 citations: [...prev.citations, newCitation],
}));
};

 const handleRemoveCitation = (index: number) => {
 setFormData((prev) => ({
 ...prev,
 citations: prev.citations.filter((_, i) => i !== index),
}));
};

 return (
 <div className="min-h-screen flex flex-col bg-background text-foreground/80 font-sans selection:bg-artisan-terracotta/30 selection:text-artisan-gold relative">
 {/* Subtle living atmospheric background */}
 <div
 className="fixed inset-0 pointer-events-none opacity-25 filter contrast-125 brightness-75 bg-cover bg-center"
 style={{
 backgroundImage: "url('/atelier/atelier_panorama.png')",
}}
 />
 <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-background/90 via-[#16120E]/85 to-[#14100D]/95" />

 {/* 1. Navbar */}
 <Navbar />

 <main className="relative z-10 flex-1 max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-14 w-full">
 {/* ========================================================================= */}
 {/* LIST VIEW */}
 {/* ========================================================================= */}
 {mode === "list" && (
 <div className="space-y-10">
 {/* Header / Masthead */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-surface-border pb-6">
 <div className="space-y-1.5">
 <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-artisan-gold">
 <span>EKMEKLAB YAZI MASASI</span>
 <span>·</span>
 <span>SAYI & İÇERİK YÖNETİMİ</span>
 </div>
 <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground">
 Bilim & Zanaat Bülteni Yayın Odası
 </h1>
 <p className="text-xs sm:text-sm text-artisan-gold/90 font-serif italic">
 "Hücresel biyokimya, ata tohumları ve geleneksel mandıra araştırmalarını buradan yönetin."
 </p>
 </div>

 <div className="flex items-center gap-3">
 <a
 href="/admin/kutuphane"
 className="px-4 py-2 rounded-xl bg-[#1A1410] border border-amber-500/30 text-xs font-mono uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-all"
 >
 ⚙️ Admin CMS Masası
 </a>
 <a
 href="/kutuphane"
 className="px-4 py-2 rounded-xl border border-surface-border text-xs font-mono uppercase tracking-wider text-foreground/80/70 hover:text-foreground hover:border-[#D2B48C] transition-all"
 >
 ← Kütüphaneye Dön
 </a>
 <button
 type="button"
 onClick={handleStartNew}
 className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-artisan-terracotta hover:bg-[#A06D46] text-foreground font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-lg hover:shadow-[0_0_15px_rgba(139,94,60,0.4)]"
 >
 <Plus className="w-4 h-4" />
 <span>Yeni Sayı Başlat</span>
 </button>
 </div>
 </div>

 {/* Articles List */}
 <div className="space-y-4">
 <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-artisan-gold/80 pb-1 border-b border-[#2A2017]">
 <span>Yayındaki Sayılar ({articles.length})</span>
 <span className="text-foreground/80/50">Düzenleme & Silme Yetkisi</span>
 </div>

 <div className="divide-y divide-[#2A2017]">
 {articles.map((article) => (
 <div
 key={article.id}
 className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
 >
 <div className="space-y-1.5 max-w-2xl">
 <div className="flex items-center gap-2.5 text-[11px] font-mono text-artisan-gold">
 <span className="font-bold">{article.volumeTitle}</span>
 <span>·</span>
 <span className="text-foreground/80/60">{article.categoryLabel}</span>
 <span>·</span>
 <span className="text-foreground/80/60">{article.readingTimeMinutes} Dk</span>
 </div>

 <h3 className="font-serif text-lg sm:text-xl font-semibold text-foreground group-hover:text-artisan-gold transition-colors">
 {article.title}
 </h3>

 <p className="font-serif text-xs sm:text-sm text-foreground/80/80 italic line-clamp-1">
 "{article.subtitle}"
 </p>

 <div className="text-[11px] font-mono text-foreground/80/50 pt-0.5">
 URL: /kutuphane/{article.slug} · {article.sections.length} Bölüm ·{" "}
 {article.citations.length} Kaynakça
 </div>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-2 pt-2 md:pt-0">
 <a
 href={`/kutuphane/${article.slug}`}
 target="_blank"
 rel="noreferrer"
 className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-surface-border text-xs font-mono text-foreground/80/80 hover:text-foreground hover:border-[#D2B48C] transition-all"
 title="Canlı Okuyucuda Gör"
 >
 <ExternalLink className="w-3.5 h-3.5" />
 <span className="hidden sm:inline">Önizle</span>
 </a>

 <button
 type="button"
 onClick={() => handleEdit(article)}
 className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2A2017] hover:bg-[#3D2E22] text-foreground text-xs font-mono uppercase tracking-wider font-semibold transition-all border border-surface-border"
 >
 <Edit3 className="w-3.5 h-3.5 text-artisan-gold" />
 <span>Düzenle</span>
 </button>

 {deleteConfirmId === article.id ? (
 <div className="flex items-center gap-1">
 <button
 type="button"
 onClick={() => {
 deleteArticle(article.id);
 setDeleteConfirmId(null);
}}
 className="px-3 py-2 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-200 text-xs font-mono font-bold transition-all border border-red-800"
 >
 Evet, Sil
 </button>
 <button
 type="button"
 onClick={() => setDeleteConfirmId(null)}
 className="px-2.5 py-2 rounded-lg bg-[#2A2017] text-xs font-mono text-foreground/80/60 hover:text-foreground"
 >
 Vazgeç
 </button>
 </div>
 ) : (
 <button
 type="button"
 onClick={() => setDeleteConfirmId(article.id)}
 className="p-2 rounded-lg text-foreground/80/40 hover:text-red-400 hover:bg-red-950/30 transition-all"
 title="Bu Sayıyı Sil"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Reset to defaults safety net */}
 <div className="pt-8 border-t border-[#2A2017] flex items-center justify-between text-xs font-mono text-foreground/80/50">
 <span>EkmekLab Zanaat Masası CMS v1.0</span>
 <button
 type="button"
 onClick={() => {
 if (confirm("Mevcut değişiklikler sıfırlanıp 2 orijinal tohum makaleye dönülsün mü?")) {
 resetToDefaults();
}
}}
 className="hover:text-artisan-gold transition-colors flex items-center gap-1"
 >
 <RefreshCw className="w-3 h-3" />
 <span>Fabrika Ayarlarına Sıfırla (Kök Makaleler)</span>
 </button>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* EDIT / CREATE FORM VIEW */}
 {/* ========================================================================= */}
 {mode === "edit" && (
 <form onSubmit={handleSave} className="space-y-10">
 {/* Top Bar Navigation */}
 <div className="flex items-center justify-between border-b-2 border-surface-border pb-5">
 <button
 type="button"
 onClick={() => setMode("list")}
 className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-artisan-gold hover:text-foreground transition-colors"
 >
 <ArrowLeft className="w-4 h-4" />
 <span>Listeye Dön</span>
 </button>

 <div className="flex items-center gap-3">
 {saveSuccess && (
 <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold">
 <Check className="w-4 h-4" />
 <span>Kaydedildi!</span>
 </div>
 )}
 <button
 type="submit"
 className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-artisan-terracotta hover:bg-[#A06D46] text-foreground font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-lg hover:shadow-[0_0_15px_rgba(139,94,60,0.5)]"
 >
 <Save className="w-4 h-4" />
 <span>Sayıyı Kaydet & Yayına Al</span>
 </button>
 </div>
 </div>

 {/* 1. Masthead & Identity Section */}
 <section className="space-y-4">
 <div className="text-xs font-mono uppercase tracking-widest text-artisan-gold font-semibold border-b border-[#2A2017] pb-1">
 1. Künye & Kimlik Bilgileri
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1 sm:col-span-2">
 <label className="text-xs font-mono text-artisan-gold/90">
 Makale Başlığı (Dignified Serif) *
 </label>
 <input
 type="text"
 required
 value={formData.title}
 onChange={(e) => handleTitleChange(e.target.value)}
 placeholder="Örn: Ata Tohumu Karakılçık ve 36 Saatin Biyokimyası"
 className="w-full bg-[#1A140F] border border-surface-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:border-[#D2B48C] focus:outline-none transition-colors"
 />
 </div>

 <div className="space-y-1 sm:col-span-2">
 <label className="text-xs font-mono text-artisan-gold/90">Alt Başlık (İtalik Merak Cümlesi)</label>
 <input
 type="text"
 value={formData.subtitle}
 onChange={(e) => setFormData({ ...formData, subtitle: e.target.value})}
 placeholder="Örn: Ekşi Mayalı Ekmek Neden Şişkinlik Yapmaz ve Kepek Neden Kansızlığı Önler?"
 className="w-full bg-[#1A140F] border border-surface-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:border-[#D2B48C] focus:outline-none transition-colors"
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-mono text-artisan-gold/90">Cilt / Dosya Adı</label>
 <input
 type="text"
 value={formData.volumeTitle}
 onChange={(e) => setFormData({ ...formData, volumeTitle: e.target.value})}
 placeholder="Örn: Cilt I: Ata Tohumları & Soğuk Fermantasyon"
 className="w-full bg-[#1A140F] border border-surface-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:border-[#D2B48C] focus:outline-none transition-colors"
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-mono text-artisan-gold/90">URL Anahtarı (Slug) *</label>
 <input
 type="text"
 required
 value={formData.slug}
 onChange={(e) => setFormData({ ...formData, slug: e.target.value})}
 placeholder="karakilcik-36-saat"
 className="w-full bg-[#1A140F] border border-surface-border rounded-xl px-4 py-2.5 text-artisan-gold font-mono text-sm focus:border-[#D2B48C] focus:outline-none transition-colors"
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-mono text-artisan-gold/90">Kategori</label>
 <select
 value={formData.category}
 onChange={(e) => {
 const cat = e.target.value as JournalCategory;
 let label = "Tahıl & Ekmek";
 if (cat === "mandira") label = "Mandıra & Şarküteri";
 if (cat === "et") label = "Kavurma & Şarküteri";
 if (cat === "metabolizma") label = "Metabolizma & Sindirim";
 if (cat === "felsefe") label = "Zanaat & Felsefe";
 setFormData({ ...formData, category: cat, categoryLabel: label});
}}
 className="w-full bg-[#1A140F] border border-surface-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:border-[#D2B48C] focus:outline-none transition-colors"
 >
 <option value="tahil">Tahıl & Ekmek</option>
 <option value="mandira">Mandıra & Şarküteri</option>
 <option value="et">Kavurma & Şarküteri</option>
 <option value="metabolizma">Metabolizma & Sindirim</option>
 <option value="felsefe">Zanaat & Felsefe</option>
 </select>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-xs font-mono text-artisan-gold/90">Yayın Tarihi</label>
 <input
 type="text"
 value={formData.publishedDate}
 onChange={(e) => setFormData({ ...formData, publishedDate: e.target.value})}
 placeholder="Eylül 2026"
 className="w-full bg-[#1A140F] border border-surface-border rounded-xl px-3 py-2.5 text-foreground text-sm focus:border-[#D2B48C] focus:outline-none transition-colors"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs font-mono text-artisan-gold/90">Okuma Süresi (Dk)</label>
 <input
 type="number"
 min={1}
 max={60}
 value={formData.readingTimeMinutes}
 onChange={(e) =>
 setFormData({ ...formData, readingTimeMinutes: parseInt(e.target.value) || 4})
}
 className="w-full bg-[#1A140F] border border-surface-border rounded-xl px-3 py-2.5 text-foreground text-sm focus:border-[#D2B48C] focus:outline-none transition-colors"
 />
 </div>
 </div>
 </div>
 </section>

 {/* 2. 30-Second Takeaway */}
 <section className="space-y-3">
 <div className="text-xs font-mono uppercase tracking-widest text-artisan-gold font-semibold border-b border-[#2A2017] pb-1 flex items-center gap-2">
 <Sparkles className="w-3.5 h-3.5" />
 <span>2. 30 Saniyede Özet (Hap Bilgi)</span>
 </div>
 <p className="text-xs font-serif italic text-artisan-gold/70">
 Müşterinin 30 saniyede okuyup anlayacağı, sıfır Latince terim içeren pratik hap özet.
 </p>
 <textarea
 rows={3}
 value={formData.thirtySecondTakeaway}
 onChange={(e) => setFormData({ ...formData, thirtySecondTakeaway: e.target.value})}
 placeholder="Örn: Bu ekmek fırına girmeden önce 36 saat boyunca +4°C'de bekler. Bu sürede unun içindeki enzimler gluteni parçalar..."
 className="w-full bg-[#1A140F] border border-surface-border rounded-xl p-4 text-foreground text-sm font-serif leading-relaxed focus:border-[#D2B48C] focus:outline-none transition-colors"
 />
 </section>

 {/* 3. Opening Paragraph & Drop-Cap */}
 <section className="space-y-3">
 <div className="text-xs font-mono uppercase tracking-widest text-artisan-gold font-semibold border-b border-[#2A2017] pb-1">
 3. Giriş Paragrafı (Lead Story) & Baş Harf (Drop-Cap)
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
 <div className="sm:col-span-2 space-y-1">
 <label className="text-xs font-mono text-artisan-gold/90">Büyük Harf</label>
 <input
 type="text"
 maxLength={1}
 value={formData.dropCapLetter}
 onChange={(e) => setFormData({ ...formData, dropCapLetter: e.target.value.toUpperCase()})}
 className="w-full text-center bg-[#1A140F] border border-surface-border rounded-xl py-2.5 font-serif text-2xl font-bold text-artisan-gold focus:border-[#D2B48C] focus:outline-none transition-colors"
 />
 </div>
 <div className="sm:col-span-10 space-y-1">
 <label className="text-xs font-mono text-artisan-gold/90">
 Giriş Paragrafı Metni (İlk harften sonra devam eden kısım)
 </label>
 <textarea
 rows={4}
 value={formData.leadParagraph}
 onChange={(e) => setFormData({ ...formData, leadParagraph: e.target.value})}
 placeholder="ugün market raflarında satılan fırın ürünlerinin büyük çoğunluğu..."
 className="w-full bg-[#1A140F] border border-surface-border rounded-xl p-3.5 text-foreground text-sm font-serif leading-relaxed focus:border-[#D2B48C] focus:outline-none transition-colors"
 />
 </div>
 </div>
 </section>

 {/* 4. Sections Manager */}
 <section className="space-y-6">
 <div className="flex items-center justify-between border-b border-[#2A2017] pb-1">
 <div className="text-xs font-mono uppercase tracking-widest text-artisan-gold font-semibold flex items-center gap-2">
 <FileText className="w-3.5 h-3.5" />
 <span>4. Makale Bölümleri ({formData.sections.length})</span>
 </div>
 <button
 type="button"
 onClick={handleAddSection}
 className="inline-flex items-center gap-1.5 text-xs font-mono text-artisan-gold hover:text-foreground transition-colors"
 >
 <Plus className="w-3.5 h-3.5" />
 <span>Bölüm Ekle</span>
 </button>
 </div>

 <div className="space-y-8">
 {formData.sections.map((section, sIdx) => (
 <div
 key={section.id || sIdx}
 className="p-5 rounded-2xl bg-[#18130F] border border-[#2D2218] space-y-4"
 >
 <div className="flex items-center justify-between border-b border-[#2A2017] pb-2">
 <span className="text-xs font-mono uppercase tracking-wider text-artisan-gold font-bold">
 Bölüm {sIdx + 1}
 </span>
 {formData.sections.length > 1 && (
 <button
 type="button"
 onClick={() => handleRemoveSection(sIdx)}
 className="text-xs font-mono text-red-400/70 hover:text-red-300 transition-colors flex items-center gap-1"
 >
 <Trash2 className="w-3 h-3" />
 <span>Bölümü Kaldır</span>
 </button>
 )}
 </div>

 <div className="space-y-1">
 <label className="text-xs font-mono text-artisan-gold/80">Bölüm Başlığı</label>
 <input
 type="text"
 value={section.heading}
 onChange={(e) => handleSectionHeadingChange(sIdx, e.target.value)}
 placeholder="Örn: 1. Midedeki Davul Etkisi: Gluten Neden Düşman Oldu?"
 className="w-full bg-background border border-surface-border rounded-xl px-4 py-2 text-foreground text-sm font-serif font-semibold focus:border-[#D2B48C] focus:outline-none transition-colors"
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-mono text-artisan-gold/80">
 Paragraflar (Paragraflar arasına bir boş satır bırakınız)
 </label>
 <textarea
 rows={6}
 value={section.paragraphs.join("\n\n")}
 onChange={(e) => handleSectionParagraphsChange(sIdx, e.target.value)}
 placeholder="Paragraf metnini buraya yazın..."
 className="w-full bg-background border border-surface-border rounded-xl p-3.5 text-foreground/80 text-sm font-serif leading-relaxed focus:border-[#D2B48C] focus:outline-none transition-colors"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
 <div className="space-y-1">
 <label className="text-xs font-mono text-artisan-gold/80">
 Vurucu Alıntı (Pull Quote - Opsiyonel)
 </label>
 <input
 type="text"
 value={section.pullQuote || ""}
 onChange={(e) => handleSectionPullQuoteChange(sIdx, e.target.value)}
 placeholder="“Zaman, ekşi mayanın içindeki en güçlü enzimdir.”"
 className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-foreground text-xs font-serif italic focus:border-[#D2B48C] focus:outline-none transition-colors"
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-mono text-artisan-gold/80">
 Gravür / Anatomi Çizimi
 </label>
 <select
 value={section.diagram?.type || "none"}
 onChange={(e) =>
 handleSectionDiagramChange(
 sIdx,
 e.target.value as "none" | "wheat_anatomy" | "dairy_fermentation"
 )
}
 className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-foreground text-xs focus:border-[#D2B48C] focus:outline-none transition-colors"
 >
 <option value="none">Çizim Yok</option>
 <option value="wheat_anatomy">Ata Tohumu Buğday Anatomisi (Gravür)</option>
 <option value="dairy_fermentation">Çiğ Süt & Yoğurt Mikrobiyolojisi (Gravür)</option>
 </select>
 </div>
 </div>
 </div>
 ))}
 </div>
 </section>

 {/* 5. Commercial Bridge (Kanca Ürün) */}
 <section className="space-y-3">
 <div className="text-xs font-mono uppercase tracking-widest text-artisan-gold font-semibold border-b border-[#2A2017] pb-1">
 5. Tezgâh Köprüsü (Makaleye Bağlanacak Kanca Ürün)
 </div>
 <p className="text-xs font-serif italic text-artisan-gold/70">
 Okuyucunun makaleyi okuduktan sonra tezgâhtan tek tıkla sepetine ekleyebileceği ilgili ürün.
 </p>

 <select
 value={formData.relatedProductId}
 onChange={(e) => setFormData({ ...formData, relatedProductId: e.target.value})}
 className="w-full bg-[#1A140F] border border-surface-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:border-[#D2B48C] focus:outline-none transition-colors"
 >
 {allProducts.map((prod) => (
 <option key={prod.id} value={prod.id}>
 {prod.name} ({prod.price} TL)
 </option>
 ))}
 </select>
 </section>

 {/* 6. Academic Citations */}
 <section className="space-y-4">
 <div className="flex items-center justify-between border-b border-[#2A2017] pb-1">
 <div className="text-xs font-mono uppercase tracking-widest text-artisan-gold font-semibold">
 6. Akademik Kaynakça & Hakemli Literatür ({formData.citations.length})
 </div>
 <button
 type="button"
 onClick={handleAddCitation}
 className="inline-flex items-center gap-1 text-xs font-mono text-artisan-gold hover:text-foreground transition-colors"
 >
 <Plus className="w-3.5 h-3.5" />
 <span>Kaynak Ekle</span>
 </button>
 </div>

 <div className="space-y-3">
 {formData.citations.map((c, cIdx) => (
 <div
 key={cIdx}
 className="p-3.5 rounded-xl bg-[#18130F] border border-[#2D2218] flex flex-col sm:flex-row items-start sm:items-center gap-3"
 >
 <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 w-full">
 <input
 type="text"
 placeholder="Yazarlar (Örn: Di Cagno et al.)"
 value={c.authors}
 onChange={(e) => {
 const next = [...formData.citations];
 next[cIdx].authors = e.target.value;
 setFormData({ ...formData, citations: next});
}}
 className="bg-background border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
 />
 <input
 type="number"
 placeholder="Yıl (2002)"
 value={c.year}
 onChange={(e) => {
 const next = [...formData.citations];
 next[cIdx].year = parseInt(e.target.value) || 2026;
 setFormData({ ...formData, citations: next});
}}
 className="bg-background border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
 />
 <input
 type="text"
 placeholder="Makale Başlığı"
 value={c.title}
 onChange={(e) => {
 const next = [...formData.citations];
 next[cIdx].title = e.target.value;
 setFormData({ ...formData, citations: next});
}}
 className="bg-background border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
 />
 <input
 type="text"
 placeholder="Dergi & Bulgu"
 value={c.finding}
 onChange={(e) => {
 const next = [...formData.citations];
 next[cIdx].finding = e.target.value;
 setFormData({ ...formData, citations: next});
}}
 className="bg-background border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
 />
 </div>
 <button
 type="button"
 onClick={() => handleRemoveCitation(cIdx)}
 className="p-1 text-red-400/60 hover:text-red-300"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 ))}
 </div>
 </section>

 {/* Bottom Actions */}
 <div className="pt-6 border-t border-surface-border flex items-center justify-between">
 <button
 type="button"
 onClick={() => setMode("list")}
 className="px-5 py-2.5 rounded-xl border border-surface-border font-mono text-xs uppercase tracking-wider text-foreground/80/70 hover:text-foreground hover:border-[#D2B48C] transition-all"
 >
 Vazgeç / İptal
 </button>

 <button
 type="submit"
 className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-artisan-terracotta hover:bg-[#A06D46] text-foreground font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-lg hover:shadow-[0_0_15px_rgba(139,94,60,0.5)]"
 >
 <Save className="w-4 h-4" />
 <span>Sayıyı Kaydet & Yayına Al</span>
 </button>
 </div>
 </form>
 )}
 </main>

 {/* Footer */}
 <Footer />
 </div>
 );
}
