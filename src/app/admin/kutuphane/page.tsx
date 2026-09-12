"use client";

import React, { useState } from "react";
import { useJournal } from "@/hooks/useJournal";
import { useProducts } from "@/hooks/useProducts";
import { JournalArticle, JournalSection, JournalCitation, JournalCategory } from "@/types/journal";
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
import Link from "next/link";

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
  sections: [{ ...EMPTY_SECTION }],
  citations: [],
  relatedProductId: "",
};

export default function AdminKutuphanePage() {
  const { articles, loading, saveArticle, deleteArticle, resetToDefaults } = useJournal();
  const { allProducts } = useProducts();

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
      volumeTitle: `Cilt ${nextVolume}: Zanaat Araştırması`,
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
    }, 800);
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
      return { ...prev, sections: nextSections };
    });
  };

  const handleSectionParagraphsChange = (index: number, val: string) => {
    const paragraphs = val.split("\n\n").map((p) => p.trim()).filter(Boolean);
    setFormData((prev) => {
      const nextSections = [...prev.sections];
      nextSections[index].paragraphs = paragraphs.length > 0 ? paragraphs : [""];
      return { ...prev, sections: nextSections };
    });
  };

  const handleSectionPullQuoteChange = (index: number, val: string) => {
    setFormData((prev) => {
      const nextSections = [...prev.sections];
      nextSections[index].pullQuote = val;
      return { ...prev, sections: nextSections };
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
          caption: "Ata tohumu buğday tanesinin anatomisi: Kepek, Ruşeym ve Endosperm.",
          altText: "Buğday anatomisi",
        };
      } else {
        nextSections[index].diagram = {
          type: "dairy_fermentation",
          caption: "Çiğ süt mikrobiyolojisi: Kazein pıhtısı ve canlı laktik asit flora dengesi.",
          altText: "Süt fermantasyon grafiği",
        };
      }
      return { ...prev, sections: nextSections };
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
    <div className="space-y-8 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-500 uppercase tracking-widest">
            <BookOpen className="w-3.5 h-3.5" />
            <span>ZANAAT KÜTÜPHANESİ & BÜLTEN CMS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100 mt-1">
            Bilimsel Yazı & Araştırma Masası
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Ekşi mayalama bilimi, buğday genetiği ve Jersey süt araştırmalarını vitrinde yayınlayın
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/kutuphane"
            target="_blank"
            className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-300 hover:text-stone-100 text-xs font-medium border border-stone-800 flex items-center gap-1.5 transition-all"
          >
            <span>Vitrin Kütüphanesini Gör</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {mode === "list" ? (
            <button
              type="button"
              onClick={handleStartNew}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-serif font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Araştırma Dosyası</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode("list")}
              className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Listeye Geri Dön</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LIST VIEW */}
      {/* ========================================================================= */}
      {mode === "list" && (
        <div className="space-y-6">
          {loading ? (
            <div className="p-12 text-center text-stone-500 text-sm">Makaleler yükleniyor...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="bg-[#181310] border border-stone-800 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Cilt {article.volumeNumber} · {article.categoryLabel}
                      </span>
                      <span className="text-[11px] font-mono text-stone-500">
                        {article.readingTimeMinutes} dk okuma
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-stone-100 group-hover:text-amber-300 transition-colors line-clamp-2">
                      {article.title}
                    </h3>

                    <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                      {article.subtitle || article.thirtySecondTakeaway}
                    </p>

                    <div className="text-[11px] font-mono text-stone-500 pt-1">
                      Yayın: {article.publishedDate} · {article.sections.length} Bölüm ·{" "}
                      {article.citations.length} Kaynakça
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-800/80 flex items-center justify-between gap-2">
                    <Link
                      href={`/kutuphane/${article.slug}`}
                      target="_blank"
                      className="text-xs text-stone-400 hover:text-amber-400 inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Görüntüle</span>
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(article)}
                        className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 text-xs font-medium border border-stone-700 flex items-center gap-1 transition-colors"
                      >
                        <Edit3 className="w-3 h-3 text-amber-400" />
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
                            className="px-2 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold"
                          >
                            Evet, Sil
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1.5 rounded-lg bg-stone-800 text-stone-400 text-[11px]"
                          >
                            İptal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(article.id)}
                          className="p-1.5 rounded-lg bg-stone-900 hover:bg-red-950/40 text-stone-500 hover:text-red-400 border border-stone-800 hover:border-red-800/40 transition-colors"
                          title="Makaleyi Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reset to defaults warning / helper */}
          <div className="pt-8 border-t border-stone-800/60 flex items-center justify-between text-xs text-stone-500">
            <span>Toplam {articles.length} araştırma dosyası kayıtlı</span>
            <button
              type="button"
              onClick={() => {
                if (confirm("Varsayılan araştırma makalelerine sıfırlamak istediğinize emin misiniz?")) {
                  resetToDefaults();
                }
              }}
              className="inline-flex items-center gap-1 text-stone-500 hover:text-amber-400 text-[11px] transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Örnek Makaleleri Yeniden Yükle</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT / CREATE FORM */}
      {/* ========================================================================= */}
      {mode === "edit" && (
        <form onSubmit={handleSave} className="space-y-8 max-w-4xl mx-auto">
          {/* Section 1: Meta Information */}
          <div className="bg-[#181310] border border-stone-800 rounded-2xl p-6 space-y-5">
            <h2 className="text-base font-serif font-bold text-stone-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>1. Cilt & Dosya Künyesi</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Cilt Numarası</label>
                <input
                  type="number"
                  min="1"
                  value={formData.volumeNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      volumeNumber: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 font-mono"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs text-stone-400 mb-1">Cilt Başlığı / Serisi</label>
                <input
                  type="text"
                  value={formData.volumeTitle}
                  onChange={(e) => setFormData((prev) => ({ ...prev, volumeTitle: e.target.value }))}
                  placeholder="örn: Cilt III: Zanaat Masası"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 font-serif"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const cat = e.target.value as JournalCategory;
                    const labels: Record<JournalCategory, string> = {
                      tahil: "Tahıl & Ekmek",
                      mandira: "Süt & Mandıra",
                      et: "Şarküteri & Et",
                      metabolizma: "Metabolizma & Sağlık",
                      felsefe: "Zanaat Felsefesi",
                    };
                    setFormData((prev) => ({
                      ...prev,
                      category: cat,
                      categoryLabel: labels[cat] || "Tahıl & Ekmek",
                    }));
                  }}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100"
                >
                  <option value="tahil">Tahıl & Ekmek</option>
                  <option value="mandira">Süt & Mandıra</option>
                  <option value="et">Şarküteri & Et</option>
                  <option value="metabolizma">Metabolizma & Sağlık</option>
                  <option value="felsefe">Zanaat Felsefesi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">İlişkili Ürün (Öneri)</label>
                <select
                  value={formData.relatedProductId || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, relatedProductId: e.target.value }))}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100"
                >
                  <option value="">İlişkili ürün yok</option>
                  {allProducts.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} ({prod.price} ₺)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-stone-400 mb-1">Makale Başlığı</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="örn: Ata Buğdayı Karakılçık ve Düşük Glisemik İndeks Paradoksu"
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-base font-serif font-bold text-stone-100"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-stone-400 mb-1">URL Yolu (Slug)</label>
                <div className="flex items-center gap-1 font-mono text-xs text-stone-500 bg-stone-900 px-3 py-2 rounded-xl border border-stone-800">
                  <span>/kutuphane/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    className="bg-transparent text-amber-400 focus:outline-none flex-1 font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">Okuma Süresi (Dakika)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.readingTimeMinutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      readingTimeMinutes: parseInt(e.target.value) || 3,
                    }))
                  }
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-stone-400 mb-1">Alt Başlık (Giriş Cümlesi)</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                placeholder="örn: Modern hibrit tohumlara karşı atalık unların bağırsak florasına etkileri"
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
              />
            </div>

            <div>
              <label className="block text-xs text-stone-400 mb-1">
                30 Saniyelik Hızlı Çıkarım (Özet Kutu)
              </label>
              <textarea
                rows={2}
                value={formData.thirtySecondTakeaway}
                onChange={(e) => setFormData((prev) => ({ ...prev, thirtySecondTakeaway: e.target.value }))}
                placeholder="Okuyucunun 30 saniyede aklında kalması gereken altın bilimsel kural..."
                className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 text-xs text-stone-200"
              />
            </div>

            <div>
              <label className="block text-xs text-stone-400 mb-1">Giriş Paragrafı (Lead)</label>
              <textarea
                rows={3}
                value={formData.leadParagraph}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    leadParagraph: e.target.value,
                    dropCapLetter: e.target.value.charAt(0) || prev.dropCapLetter,
                  }))
                }
                placeholder="Giriş paragrafı (İlk harf büyük süslü harf olarak gösterilir)..."
                className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 text-sm text-stone-200 leading-relaxed font-serif"
              />
            </div>
          </div>

          {/* Section 2: Content Sections */}
          <div className="bg-[#181310] border border-stone-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-serif font-bold text-stone-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <span>2. Metin Bölümleri ({formData.sections.length})</span>
              </h2>
              <button
                type="button"
                onClick={handleAddSection}
                className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-semibold border border-stone-700 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bölüm Ekle</span>
              </button>
            </div>

            <div className="space-y-6">
              {formData.sections.map((sec, idx) => (
                <div
                  key={sec.id || idx}
                  className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-4 space-y-4 relative group"
                >
                  <div className="flex items-center justify-between border-b border-stone-850 pb-2">
                    <span className="font-mono text-xs text-amber-500 font-bold">
                      Bölüm #{idx + 1}
                    </span>
                    {formData.sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSection(idx)}
                        className="text-stone-500 hover:text-red-400 p-1"
                        title="Bölümü Kaldır"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 mb-1">Bölüm Başlığı</label>
                    <input
                      type="text"
                      value={sec.heading}
                      onChange={(e) => handleSectionHeadingChange(idx, e.target.value)}
                      placeholder="örn: 1. Ruşeym Katmanındaki Folat ve B Vitaminleri"
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-sm font-serif font-bold text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 mb-1">
                      Paragraflar (Paragraflar arasına iki Enter basarak boşluk bırakın)
                    </label>
                    <textarea
                      rows={5}
                      value={sec.paragraphs.join("\n\n")}
                      onChange={(e) => handleSectionParagraphsChange(idx, e.target.value)}
                      placeholder="Paragraf metnini buraya yazın..."
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 text-xs text-stone-200 leading-relaxed font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">
                        Öne Çıkan Alıntı (Pull-Quote)
                      </label>
                      <input
                        type="text"
                        value={sec.pullQuote || ""}
                        onChange={(e) => handleSectionPullQuoteChange(idx, e.target.value)}
                        placeholder="İsteğe bağlı dikkat çeken bir cümle..."
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs italic text-amber-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-stone-400 mb-1">
                        Bilimsel Diyagram Ekle
                      </label>
                      <select
                        value={sec.diagram?.type || "none"}
                        onChange={(e) =>
                          handleSectionDiagramChange(
                            idx,
                            e.target.value as "none" | "wheat_anatomy" | "dairy_fermentation"
                          )
                        }
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
                      >
                        <option value="none">Diyagram Yok</option>
                        <option value="wheat_anatomy">🌾 Ata Buğdayı Anatomisi</option>
                        <option value="dairy_fermentation">🥛 Süt & Canlı Flora Dönüşümü</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Academic Citations */}
          <div className="bg-[#181310] border border-stone-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-serif font-bold text-stone-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <span>3. Akademik Kaynakça ({formData.citations.length})</span>
              </h2>
              <button
                type="button"
                onClick={handleAddCitation}
                className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-semibold border border-stone-700 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kaynak Ekle</span>
              </button>
            </div>

            {formData.citations.length === 0 ? (
              <p className="text-xs text-stone-500 italic">Henüz bir akademik makale veya tez eklenmedi.</p>
            ) : (
              <div className="space-y-4">
                {formData.citations.map((cite, idx) => (
                  <div
                    key={idx}
                    className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-stone-400">Kaynak #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCitation(idx)}
                        className="text-stone-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] text-stone-400 mb-1">Yazar(lar)</label>
                        <input
                          type="text"
                          value={cite.authors}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => {
                              const nextCites = [...prev.citations];
                              nextCites[idx].authors = val;
                              return { ...prev, citations: nextCites };
                            });
                          }}
                          placeholder="örn: De Angelis, M., et al."
                          className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-200"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-stone-400 mb-1">Yıl</label>
                        <input
                          type="number"
                          value={cite.year}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 2024;
                            setFormData((prev) => {
                              const nextCites = [...prev.citations];
                              nextCites[idx].year = val;
                              return { ...prev, citations: nextCites };
                            });
                          }}
                          className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-stone-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-stone-400 mb-1">Makale Adı & Dergi</label>
                      <input
                        type="text"
                        value={cite.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev) => {
                            const nextCites = [...prev.citations];
                            nextCites[idx].title = val;
                            return { ...prev, citations: nextCites };
                          });
                        }}
                        placeholder="örn: Sourdough fermentation degradation of celiac immunoreactive peptides..."
                        className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-200"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
            <button
              type="button"
              onClick={() => setMode("list")}
              className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium border border-stone-800 transition-colors"
            >
              Vazgeç
            </button>

            <button
              type="submit"
              disabled={saveSuccess}
              className={`px-6 py-2.5 rounded-xl text-xs font-serif font-bold flex items-center gap-2 transition-all ${
                saveSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg shadow-amber-500/20"
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Başarıyla Kaydedildi!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Makaleyi Yayınla & Kaydet</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
