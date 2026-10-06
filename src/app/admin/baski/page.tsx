"use client";

import React, { useEffect, useState, useMemo } from "react";
import QRCode from "qrcode";
import {
  Printer,
  Sliders,
  RotateCcw,
  ExternalLink,
  Tag,
  Check,
  Package,
  Layers,
  Sparkles,
} from "lucide-react";
import { useAdminCatalog } from "@/hooks/useAdminCatalog";
import { labelUrl, normalizeRef, isValidRef, siteHost } from "@/lib/print/ref";
import { BreadLabel } from "@/components/admin/baski/BreadLabel";

const OFFSET_STORAGE_KEY = "ekmeklab_printer_offset_mm_v1";

interface PrinterOffset {
  x: number;
  y: number;
}

export default function AdminPrintPage() {
  const { products, loading: catalogLoading } = useAdminCatalog();

  // Selected product & custom overrides
  const [selectedProductId, setSelectedProductId] = useState<string>("custom");
  const [productName, setProductName] = useState<string>("Karakılçık Ekmeği");
  const [slug, setSlug] = useState<string>("karakilcik-36-saat");
  const [tagline, setTagline] = useState<string>("36 saat soğuk fermantasyon");
  const [rawRef, setRawRef] = useState<string>("");
  const [count, setCount] = useState<number>(1);

  // Calibration offsets (mm)
  const [offset, setOffset] = useState<PrinterOffset>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(OFFSET_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return { x: 0, y: 0 };
  });

  // QR Code Data URL state
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [generatingQr, setGeneratingQr] = useState<boolean>(true);

  // Normalized ref code
  const refCode = useMemo(() => {
    if (!rawRef.trim()) return null;
    const norm = normalizeRef(rawRef);
    return isValidRef(norm) ? norm : null;
  }, [rawRef]);

  // Target landing URL
  const targetUrl = useMemo(() => {
    return labelUrl(slug, refCode);
  }, [slug, refCode]);

  // When catalog loads, set first active product if still on default
  useEffect(() => {
    if (products.length > 0 && selectedProductId === "custom" && productName === "Karakılçık Ekmeği") {
      const firstBread = products.find((p) => p.category === "bread" || p.category === "ekmek") || products[0];
      if (firstBread) {
        setSelectedProductId(firstBread.id);
        setProductName(firstBread.name);
        setSlug(firstBread.slug || "ekmek");
      }
    }
  }, [products]);

  // Handle product selection change
  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    if (id === "custom") return;
    const found = products.find((p) => p.id === id);
    if (found) {
      setProductName(found.name);
      setSlug(found.slug || "ekmek");
    }
  };

  // Persist offsets
  useEffect(() => {
    try {
      localStorage.setItem(OFFSET_STORAGE_KEY, JSON.stringify(offset));
    } catch {
      // storage unavailable
    }
  }, [offset]);

  // Generate QR code on changes
  useEffect(() => {
    let active = true;
    setGeneratingQr(true);

    QRCode.toDataURL(targetUrl, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: "M",
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((dataUri) => {
        if (active) {
          setQrDataUrl(dataUri);
          setGeneratingQr(false);
        }
      })
      .catch((err) => {
        console.error("QR Code Error:", err);
        if (active) setGeneratingQr(false);
      });

    return () => {
      active = false;
    };
  }, [targetUrl]);

  // Print trigger
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const resetOffset = () => {
    setOffset({ x: 0, y: 0 });
  };

  // Generate printable array
  const printableLabels = useMemo(() => {
    const validCount = Math.max(1, Math.min(count, 100));
    return Array.from({ length: validCount });
  }, [count]);

  return (
    <>
      {/* 1. Global Print Styles for 50mm x 70mm thermal rolls */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: 50mm 70mm;
                margin: 0 !important;
              }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 50mm !important;
                height: 70mm !important;
              }
              /* Hide everything in the page body */
              body * {
                visibility: hidden !important;
              }
              /* Only make our dedicated print area visible */
              #ekmeklab-thermal-print-area,
              #ekmeklab-thermal-print-area * {
                visibility: visible !important;
              }
              #ekmeklab-thermal-print-area {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 50mm !important;
                background: #ffffff !important;
              }
              .print-label-page {
                display: block !important;
                width: 50mm !important;
                height: 70mm !important;
                max-width: 50mm !important;
                max-height: 70mm !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                background: #ffffff !important;
              }
            }
          `,
        }}
      />

      {/* 2. Admin UI Workspace (Screen only) */}
      <div className="space-y-8 print:hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#261E17] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-artisan-gold text-xs font-mono tracking-wider uppercase">
              <Tag className="w-3.5 h-3.5" />
              <span>AMBALAJ & ÜRÜN ETİKETLERİ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
              Etiket Baskı Merkezi
            </h1>
            <p className="text-xs sm:text-sm text-foreground/70 font-sans">
              5×7 cm termal rulo etiketler · Logo + Ekmek Adı + Tek Satır + QR (Adres/tarih/gramaj içermez).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              disabled={generatingQr || !qrDataUrl}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-artisan-terracotta hover:bg-[#A34720] text-white font-serif font-bold text-sm shadow-lg hover:shadow-artisan-terracotta/20 transition-all disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır ({count} Adet)</span>
            </button>
          </div>
        </div>

        {/* 2-Column Grid: Form & Calibration (Left) vs Preview (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form & Controls */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: Ekmek & İçerik Seçimi */}
            <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-5">
              <div className="flex items-center justify-between border-b border-surface-border/50 pb-3">
                <span className="font-serif font-bold text-foreground text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-artisan-gold" />
                  Ekmek ve Metin Ayarları
                </span>
                <span className="text-[10px] font-mono text-artisan-gold/80 bg-artisan-gold/10 px-2 py-0.5 rounded-full">
                  50×70 mm Termal
                </span>
              </div>

              {/* Product Selector */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-foreground/70 uppercase">
                  Katalogdan Ürün Seç
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  disabled={catalogLoading}
                  className="w-full bg-[#181310] border border-surface-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-artisan-gold transition-colors"
                >
                  <option value="custom">-- Özel Başlık / Serbest Metin --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.category ? `(${p.category})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-foreground/70 uppercase">
                  Etiketteki Ekmek Adı (Büyük Başlık)
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Örn: Taş Değirmen Karakılçık"
                  className="w-full bg-[#181310] border border-surface-border rounded-xl px-3.5 py-2.5 text-sm font-serif font-bold text-foreground focus:outline-none focus:border-artisan-gold transition-colors"
                />
              </div>

              {/* Slug Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-foreground/70 uppercase">
                    Ürün Slug'ı (QR Hedefi)
                  </label>
                  <span className="text-[10px] font-mono text-foreground/50">
                    /e/{"{slug}"}
                  </span>
                </div>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="Örn: karakilcik-36-saat"
                  className="w-full bg-[#181310] border border-surface-border rounded-xl px-3.5 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-artisan-gold transition-colors"
                />
              </div>

              {/* Optional Tagline Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-foreground/70 uppercase">
                    İsteğe Bağlı Tek Satır (Alt Bilgi)
                  </label>
                  <span className="text-[10px] font-mono text-foreground/50">
                    Opsiyonel
                  </span>
                </div>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Örn: 36 saat soğuk fermantasyon"
                  className="w-full bg-[#181310] border border-surface-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-artisan-gold transition-colors"
                />
              </div>

              {/* Point of Sale Ref Code */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-foreground/70 uppercase">
                    Satış Noktası / Şarküteri Kodu (Ref)
                  </label>
                  <span className="text-[10px] font-mono text-foreground/50">
                    3–6 harf/rakam (örn: kuzu)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rawRef}
                    onChange={(e) => setRawRef(e.target.value)}
                    placeholder="kuzu, kafe1..."
                    className="flex-1 bg-[#181310] border border-surface-border rounded-xl px-3.5 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-artisan-gold transition-colors"
                  />
                  {refCode && (
                    <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-1.5 shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      <span>?n={refCode}</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-foreground/50 font-sans">
                  Şarküteri veya kafe kodu girildiğinde QR okutma sayısı o nokta üzerinden ölçülür.
                </p>
              </div>
            </div>

            {/* Card 2: Baskı Adedi & Hızlı Seçim */}
            <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-4">
              <span className="font-serif font-bold text-foreground text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-artisan-gold" />
                Baskı Adedi
              </span>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={count}
                    onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                    className="w-24 bg-[#181310] border border-surface-border rounded-xl px-3.5 py-2.5 text-center font-mono font-bold text-base text-foreground focus:outline-none focus:border-artisan-gold"
                  />
                  <span className="text-xs font-mono text-foreground/60">Adet</span>
                </div>

                {/* Quick Count Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 5, 10, 20, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCount(num)}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-colors ${
                        count === num
                          ? "bg-artisan-gold text-[#120E0B] font-bold"
                          : "bg-[#181310] border border-surface-border text-foreground/80 hover:border-artisan-gold/50"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 3: Yazıcı Kalibrasyonu (X / Y Kaydırma) */}
            <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-5">
              <div className="flex items-center justify-between border-b border-surface-border/50 pb-3">
                <span className="font-serif font-bold text-foreground text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-artisan-gold" />
                  Yazıcı Hizalama & Kalibrasyon (Offset)
                </span>
                <button
                  type="button"
                  onClick={resetOffset}
                  className="text-xs font-mono text-foreground/60 hover:text-artisan-gold flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Sıfırla</span>
                </button>
              </div>

              <p className="text-xs text-foreground/70 font-sans leading-relaxed">
                Termal rulo etiket yazıcısının mekanik baskı sapmasını milimetrik olarak dengeler. Ayarlar bu cihazda saklanır.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Horizontal (X) */}
                <div className="p-4 rounded-2xl bg-[#181310] border border-surface-border space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-foreground/70">Yatay Kaydırma (X):</span>
                    <span className="font-bold text-artisan-gold">{offset.x.toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range"
                    min={-5}
                    max={5}
                    step={0.5}
                    value={offset.x}
                    onChange={(e) => setOffset((prev) => ({ ...prev, x: Number(e.target.value) }))}
                    className="w-full accent-artisan-gold cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-foreground/40">
                    <span>-5 mm (Sola)</span>
                    <span>0 mm</span>
                    <span>+5 mm (Sağa)</span>
                  </div>
                </div>

                {/* Vertical (Y) */}
                <div className="p-4 rounded-2xl bg-[#181310] border border-surface-border space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-foreground/70">Dikey Kaydırma (Y):</span>
                    <span className="font-bold text-artisan-gold">{offset.y.toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range"
                    min={-5}
                    max={5}
                    step={0.5}
                    value={offset.y}
                    onChange={(e) => setOffset((prev) => ({ ...prev, y: Number(e.target.value) }))}
                    className="w-full accent-artisan-gold cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-foreground/40">
                    <span>-5 mm (Yukarı)</span>
                    <span>0 mm</span>
                    <span>+5 mm (Aşağı)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Label Preview & Diagnostics */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
            <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-6 flex flex-col items-center">
              <div className="w-full flex items-center justify-between border-b border-surface-border/50 pb-3">
                <span className="font-serif font-bold text-foreground text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-artisan-gold" />
                  Canlı Etiket Önizleme
                </span>
                <span className="text-[10px] font-mono text-stone-400">
                  50 mm × 70 mm
                </span>
              </div>

              {/* Realistic 50mm x 70mm label card preview on stone hearth background */}
              <div className="p-8 rounded-2xl bg-[#1E1813] border border-[#2F241C] shadow-2xl flex flex-col items-center">
                <div className="shadow-2xl rounded-sm overflow-hidden border border-stone-200 ring-4 ring-black/20">
                  <BreadLabel
                    productName={productName}
                    tagline={tagline}
                    slug={slug}
                    refCode={refCode}
                    qrDataUrl={qrDataUrl}
                    offsetX={offset.x}
                    offsetY={offset.y}
                  />
                </div>
                <div className="text-[10px] font-mono text-stone-400 mt-4 flex items-center gap-2">
                  <span>Gerçek Ölçek: 5×7 cm</span>
                  <span>·</span>
                  <span>Termal S/B Çıktı</span>
                </div>
              </div>

              {/* Target Link Info */}
              <div className="w-full p-4 rounded-2xl bg-[#181310] border border-surface-border space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-foreground/60 text-[10px]">
                  <span>QR KOD HEDEF ADRESİ:</span>
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-artisan-gold hover:underline inline-flex items-center gap-1"
                  >
                    <span>Test Et</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 text-artisan-gold text-[11px] break-all select-all font-mono">
                  {targetUrl}
                </div>
                <div className="text-[10px] text-foreground/50 leading-relaxed font-sans pt-1">
                  Karekod tarandığında önce <span className="font-mono text-foreground/80">/e/{slug}</span> iniş rotasına uğrayarak funnel metriği kaydeder, ardından ürün sayfasına yönlenir.
                </div>
              </div>

              {/* Print Action */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={generatingQr || !qrDataUrl}
                className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-artisan-terracotta hover:bg-[#A34720] text-white font-serif font-bold text-base shadow-xl transition-all disabled:opacity-50"
              >
                <Printer className="w-5 h-5" />
                <span>Etiketleri Yazdır ({count} Adet)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Dedicated Print Area (Only visible when window.print() is called) */}
      <div id="ekmeklab-thermal-print-area" className="hidden print:block">
        {printableLabels.map((_, index) => (
          <div key={index} className="print-label-page">
            <BreadLabel
              productName={productName}
              tagline={tagline}
              slug={slug}
              refCode={refCode}
              qrDataUrl={qrDataUrl}
              offsetX={offset.x}
              offsetY={offset.y}
            />
          </div>
        ))}
      </div>
    </>
  );
}
