"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import type { Product } from "@/types";
import { tl, weightLabel, type DraftData } from "../types";
import {
  type DarkThemeVariant,
  getStoredDarkVariant,
  setStoredDarkVariant,
  applyThemeToDOM,
} from "@/lib/theme/resolveTheme";
import { Check, ArrowRight, Eye, Sparkles, Layers, Palette } from "lucide-react";

interface PaletteConfig {
  id: DarkThemeVariant;
  name: string;
  tagline: string;
  description: string;
  colors: {
    bg: string;
    surface: string;
    line: string;
    ink: string;
    inkMuted: string;
    accent: string;
  };
}

const PALETTES: Record<DarkThemeVariant, PaletteConfig> = {
  a: {
    id: "a",
    name: "Seçenek A · Döküm Taş & Sıcak Kömür",
    tagline: "Warm Charcoal & Cast Iron — En Çok Tavsiye Edilen",
    description:
      "Kızılımsı çamur tonları tamamen atıldı; döküm tava ve taş fırın isi sıcaklığında tok, derin grafit kömür. Gözü dinlendirir, fırın ruhunu korur.",
    colors: {
      bg: "#141312",
      surface: "#1E1D1A",
      line: "#322F2B",
      ink: "#F4EFEA",
      inkMuted: "#A3988C",
      accent: "#D97746",
    },
  },
  b: {
    id: "b",
    name: "Seçenek B · Obsidyen & Fırın Közü (Seçilen Tema)",
    tagline: "Deep Obsidian OLED — Tahsin'in Kararı",
    description:
      "Neredeyse saf siyah zemin (#0E0D0C) ve vitrin kartları (#181715). Ekmek fotoğraflarını, kabukların altın kraker tonlarını bir galeri gibi öne çıkarır. Mobilde maksimum OLED derinliği.",
    colors: {
      bg: "#0E0D0C",
      surface: "#181715",
      line: "#2A2724",
      ink: "#F8F4EE",
      inkMuted: "#9E9387",
      accent: "#E07A5F",
    },
  },
  old: {
    id: "old",
    name: "Eski Hali · Çamurlu Kahverengi",
    tagline: "Beğenilmeyen Mevcut Gece Modu",
    description:
      "Kızıl kahve alt tonlu pas rengi. Çamurumsu hissettiren ve gözü yoran eski sürüm; aradaki farkı net görmek için kıyaslamaya eklendi.",
    colors: {
      bg: "#1E1614",
      surface: "#281E1A",
      line: "#3D2D27",
      ink: "#F6EEDF",
      inkMuted: "#CBBBAE",
      accent: "#E07A5F",
    },
  },
};

const serif = { fontFamily: "var(--font-fraunces)" } as const;

function SwatchBadge({ hex, label }: { hex: string; label: string }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-white/10 bg-black/20 text-xs font-mono">
      <span className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: hex }} />
      <span className="text-white/60">{label}:</span>
      <span className="text-white font-semibold">{hex}</span>
    </div>
  );
}

function ProductCardMock({
  p,
  pal,
  scheduleLabel,
}: {
  p: Product;
  pal: PaletteConfig;
  scheduleLabel?: string;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden border transition-all duration-200 flex flex-col justify-between"
      style={{
        backgroundColor: pal.colors.surface,
        borderColor: pal.colors.line,
      }}
    >
      <div className="relative aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.imageUrl || "/atelier/atelier_threshold.webp"}
          alt={p.name}
          className="w-full h-full object-cover"
        />
        {scheduleLabel ? (
          <span
            className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-xs font-sans font-bold shadow-md flex items-center gap-1.5"
            style={{
              backgroundColor: pal.colors.accent,
              color: "#FFFFFF",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>{scheduleLabel}</span>
          </span>
        ) : (
          <span
            className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-xs font-sans font-semibold border shadow-md flex items-center gap-1.5"
            style={{
              backgroundColor: pal.colors.surface,
              borderColor: pal.colors.line,
              color: pal.colors.ink,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Her gün fırında</span>
          </span>
        )}
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold leading-snug" style={{ color: pal.colors.ink, ...serif }}>
            {p.name}
          </h3>
          <p className="text-xs line-clamp-2 mt-1" style={{ color: pal.colors.inkMuted }}>
            {p.description}
          </p>
        </div>

        <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: pal.colors.line }}>
          <div>
            <span className="text-xs block" style={{ color: pal.colors.inkMuted }}>
              {weightLabel(p)}
            </span>
            <span className="font-serif font-bold text-base" style={{ color: pal.colors.ink }}>
              {tl(p.price)}
            </span>
          </div>
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90 active:scale-95"
            style={{ backgroundColor: pal.colors.accent }}
          >
            Sepete Ekle
          </button>
        </div>
      </div>
    </div>
  );
}

function MockStorefrontSection({
  pal,
  breads,
  compact = false,
}: {
  pal: PaletteConfig;
  breads: Product[];
  compact?: boolean;
}) {
  const p1 = breads[0] || {
    id: "1",
    name: "Ekşi Mayalı Köy Ekmeği",
    description: "Ata tohumu taş değirmen unları ve 24 saat soğuk fermantasyon.",
    price: 130,
    weight: 950,
    weightUnit: "g",
    imageUrl: "/atelier/atelier_threshold.webp",
  };
  const p2 = breads[1] || {
    id: "2",
    name: "Gece Yarısı",
    description: "Kömürleşmiş meşe fıçısı maltı ve karakılçık harmanı özel fırın somunu.",
    price: 160,
    weight: 850,
    weightUnit: "g",
    imageUrl: "/atelier/atelier_threshold.webp",
  };

  return (
    <div
      className="rounded-3xl border p-6 sm:p-8 space-y-8 transition-colors"
      style={{
        backgroundColor: pal.colors.bg,
        borderColor: pal.colors.line,
        color: pal.colors.ink,
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between pb-4 border-b"
        style={{ borderColor: pal.colors.line }}
      >
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/logo.png" alt="EkmekLab" className="w-9 h-9 object-contain" />
          <div>
            <span className="text-lg font-bold block leading-none" style={{ color: pal.colors.ink, ...serif }}>
              EkmekLab
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: pal.colors.inkMuted }}>
              Beylikdüzü Bahçe Atölyesi
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: pal.colors.accent }}
          >
            Sepet · 2 Somun
          </span>
        </div>
      </div>

      {/* Hero stage */}
      <div className="space-y-4 max-w-xl">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono"
          style={{
            backgroundColor: pal.colors.surface,
            borderColor: pal.colors.line,
            color: pal.colors.inkMuted,
          }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pal.colors.accent }} />
          <span>Fırından Yeni Çıkan Ritim</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-bold leading-tight" style={{ color: pal.colors.ink, ...serif }}>
          Siparişe göre pişen <span style={{ color: pal.colors.accent }}>ekşi mayalı</span> ekmek.
        </h2>

        <p className="text-sm leading-relaxed" style={{ color: pal.colors.inkMuted }}>
          Sen günü seç; fırından çıktığı gün Beylikdüzü&apos;nde kendi kuryemizle kapına getirelim.
          Rafta bayatlayan ekmek yok.
        </p>
      </div>

      {/* Product cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold" style={{ color: pal.colors.ink, ...serif }}>
            Haftalık Fırın Seçkisi
          </h3>
          <span className="text-xs font-mono" style={{ color: pal.colors.inkMuted }}>
            2 Çeşit Vitrinde
          </span>
        </div>

        <div className={`grid gap-4 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
          <ProductCardMock p={p1 as Product} pal={pal} />
          <ProductCardMock p={p2 as Product} pal={pal} scheduleLabel="Her Cuma · sıradaki 10 Eki" />
        </div>
      </div>

      {/* Bilim & Zanaat Güven bandı */}
      <div
        className="p-4 sm:p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs"
        style={{
          backgroundColor: pal.colors.surface,
          borderColor: pal.colors.line,
        }}
      >
        <div className="space-y-1">
          <span className="font-bold block" style={{ color: pal.colors.ink }}>
            🔬 Taş Değirmen & %78 Hidrasyon
          </span>
          <span style={{ color: pal.colors.inkMuted }}>
            Canlı ekşi maya, sıfır ticari maya ve katkı maddesi.
          </span>
        </div>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border text-xs font-medium"
          style={{
            borderColor: pal.colors.line,
            color: pal.colors.accent,
          }}
        >
          Bilim Kütüphanesini Gör →
        </button>
      </div>
    </div>
  );
}

export function GeceDraft({ data }: { data: DraftData }) {
  const [selectedVariant, setSelectedVariant] = useState<DarkThemeVariant>("b");
  const [viewMode, setViewMode] = useState<"toggle" | "sideBySide">("toggle");
  const [appliedVariant, setAppliedVariant] = useState<DarkThemeVariant>("b");
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const current = getStoredDarkVariant();
    setSelectedVariant(current);
    setAppliedVariant(current);
  }, []);

  const handleApplyToEntireSite = (variant: DarkThemeVariant) => {
    setStoredDarkVariant(variant);
    setAppliedVariant(variant);
    applyThemeToDOM("dark", variant);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const activePal = PALETTES[selectedVariant];

  return (
    <div className="min-h-screen bg-[#0C0B0A] text-[#EDE7E1] font-sans antialiased pb-20">
      {/* Üst Karar Konsolu (Sticky) */}
      <header className="sticky top-0 z-40 bg-[#0E0D0C]/95 backdrop-blur-md border-b border-[#2A2724] px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/tasarim"
              className="text-xs text-[#9E9387] hover:text-white px-2.5 py-1 rounded-md border border-[#2A2724] hover:border-white/30 transition-colors"
            >
              ← Tasarımlar
            </Link>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2" style={serif}>
                <span>Gece Teması Laboratuvarı</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-accent/20 text-[#E07A5F] border border-[#E07A5F]/30">
                  Faz 4 Kararı
                </span>
              </h1>
              <p className="text-[11px] text-[#9E9387]">
                Seçenek A ve B&apos;yi canlı vitrinde incele; kararına göre tek tıkla tüm siteye uygula.
              </p>
            </div>
          </div>

          {/* Kontrol Butonları */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Görünüm Modu */}
            <div className="inline-flex rounded-lg p-0.5 bg-black/40 border border-[#2A2724]">
              <button
                type="button"
                onClick={() => setViewMode("toggle")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "toggle"
                    ? "bg-[#2A2724] text-white shadow-xs"
                    : "text-[#9E9387] hover:text-white"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Tekli Gör</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("sideBySide")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "sideBySide"
                    ? "bg-[#2A2724] text-white shadow-xs"
                    : "text-[#9E9387] hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Yan Yana Kıyasla</span>
              </button>
            </div>

            {/* Tüm Sitede Uygula */}
            <button
              type="button"
              onClick={() => handleApplyToEntireSite(selectedVariant)}
              className="px-4 py-1.5 rounded-lg bg-[#D97746] hover:bg-[#D97746]/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Tüm Sitede Aktif!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Bu Temayı Tüm Sitede Uygula</span>
                </>
              )}
            </button>

            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg border border-[#3D342E] text-xs font-semibold text-[#EDE7E1] hover:bg-white/5 transition-colors"
            >
              Canlı Siteye Git →
            </Link>
          </div>
        </div>
      </header>

      {/* Ana Gövde */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Seçenek Seçim Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(["a", "b", "old"] as DarkThemeVariant[]).map((key) => {
            const item = PALETTES[key];
            const isSelected = selectedVariant === key;
            const isApplied = appliedVariant === key;

            return (
              <div
                key={key}
                onClick={() => setSelectedVariant(key)}
                className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 relative ${
                  isSelected
                    ? "border-[#D97746] bg-[#1C1815] shadow-lg ring-1 ring-[#D97746]/50"
                    : "border-[#2A2724] bg-[#121110] hover:border-[#3D342E]"
                }`}
              >
                {isApplied && (
                  <span className="absolute top-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Sitede Aktif
                  </span>
                )}

                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: item.colors.bg }}
                  />
                  <h2 className="text-sm font-bold text-white leading-tight">
                    {item.name}
                  </h2>
                </div>

                <p className="text-[11px] font-mono text-[#E07A5F] mb-1.5">
                  {item.tagline}
                </p>

                <p className="text-xs text-[#9E9387] leading-relaxed mb-3">
                  {item.description}
                </p>

                {/* Minik renk kartelası */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                  {Object.entries(item.colors).map(([name, hex]) => (
                    <span
                      key={name}
                      title={`${name}: ${hex}`}
                      className="w-5 h-5 rounded-md border border-white/10 shrink-0 shadow-xs"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Görünüm 1: Yan Yana Kıyaslama */}
        {viewMode === "sideBySide" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#2A2724] pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2" style={serif}>
                <Layers className="w-5 h-5 text-[#D97746]" />
                <span>Yan Yana Kıyaslama: Seçenek A vs Seçenek B</span>
              </h3>
              <span className="text-xs text-[#9E9387]">
                Aynı ekmekler, iki farklı felsefe
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sol: Seçenek A */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-mono font-bold text-[#E07A5F]">
                    SEÇENEK A (Döküm Taş & Sıcak Kömür)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplyToEntireSite("a")}
                    className="text-xs text-white underline hover:text-[#D97746]"
                  >
                    Bunu Uygula
                  </button>
                </div>
                <MockStorefrontSection pal={PALETTES.a} breads={data.breads} compact={true} />
              </div>

              {/* Sağ: Seçenek B */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-mono font-bold text-[#E07A5F]">
                    SEÇENEK B (Obsidyen & Fırın Közü)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplyToEntireSite("b")}
                    className="text-xs text-white underline hover:text-[#D97746]"
                  >
                    Bunu Uygula
                  </button>
                </div>
                <MockStorefrontSection pal={PALETTES.b} breads={data.breads} compact={true} />
              </div>
            </div>
          </div>
        ) : (
          /* Görünüm 2: Tekli Detaylı Vitrin İncelemesi */
          <div className="space-y-6">
            {/* Renk Değerleri ve Karşılaştırma Şeridi */}
            <div className="p-4 rounded-2xl bg-[#141312] border border-[#2A2724] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#D97746]" />
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-white">
                    {activePal.name} Renk Kodları
                  </span>
                </div>
                <span className="text-xs text-[#9E9387]">
                  Contrast: WCAG AAA uyumlu metin oranları
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                <SwatchBadge hex={activePal.colors.bg} label="Zemin" />
                <SwatchBadge hex={activePal.colors.surface} label="Kart" />
                <SwatchBadge hex={activePal.colors.line} label="Çizgi" />
                <SwatchBadge hex={activePal.colors.ink} label="Metin" />
                <SwatchBadge hex={activePal.colors.inkMuted} label="İkincil" />
                <SwatchBadge hex={activePal.colors.accent} label="Vurgu" />
              </div>
            </div>

            {/* Gerçek Vitrin Sahnesi */}
            <MockStorefrontSection pal={activePal} breads={data.breads} />
          </div>
        )}
      </main>
    </div>
  );
}
