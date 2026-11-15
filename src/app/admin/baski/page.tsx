"use client";

import React, { useEffect, useState, useMemo, useRef, useId } from "react";
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
import { labelUrl, normalizeRef, isValidRef } from "@/lib/print/ref";
import { BreadLabel } from "@/components/admin/baski/BreadLabel";

const OFFSET_STORAGE_KEY = "ekmeklab_printer_offset_mm_v1";

interface PrinterOffset {
  x: number;
  y: number;
}

function parsePrinterOffset(raw: string | null): PrinterOffset {
  if (!raw) return { x: 0, y: 0 };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "x" in parsed &&
      "y" in parsed &&
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    // fallback
  }
  return { x: 0, y: 0 };
}

export default function AdminPrintPage() {
  const { products: allProducts, loading: catalogLoading } = useAdminCatalog();
  // Arşivlenmiş ürünün sayfası 404 verir; etiketteki QR ölü kalmasın.
  const products = useMemo(() => allProducts.filter((p) => p.isActive !== false), [allProducts]);

  const productSelectId = useId();
  const productNameId = useId();
  const slugId = useId();
  const taglineId = useId();
  const refInputId = useId();
  const countInputId = useId();
  const offsetXId = useId();
  const offsetYId = useId();
  const didInitRef = useRef(false);

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
        return parsePrinterOffset(localStorage.getItem(OFFSET_STORAGE_KEY));
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
    if (didInitRef.current || products.length === 0) return;
    didInitRef.current = true;
    const firstBread = products.find((p) => p.category === "bread" || p.category === "ekmek") || products[0];
    if (firstBread) {
      setSelectedProductId(firstBread.id);
      setProductName(firstBread.name);
      setSlug(firstBread.slug || "ekmek");
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2D3BD] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#8E3D1B] text-xs font-mono font-semibold tracking-wider uppercase">
              <Tag className="w-3.5 h-3.5" aria-hidden="true" />
              <span>AMBALAJ &amp; ÜRÜN ETİKETLERİ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#3B1E1A]">
              Etiket Baskı Merkezi
            </h1>
            <p className="text-xs sm:text-sm text-[#6E5148] font-sans">
              5×7 cm termal rulo etiketler · Logo + Ekmek Adı + Tek Satır + QR (Adres/tarih/gramaj içermez).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              disabled={generatingQr || !qrDataUrl}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-[#B4532A] hover:bg-[#9C4421] text-white font-serif font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              <span className="font-mono tabular-nums">Yazdır ({count} Adet)</span>
            </button>
          </div>
        </div>

        {/* 2-Column Grid: Form & Calibration (Left) vs Preview (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form & Controls */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: Ekmek & İçerik Seçimi */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2D3BD] shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-[#E2D3BD] pb-3">
                <span className="font-serif font-bold text-[#3B1E1A] text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
                  Ekmek ve Metin Ayarları
                </span>
                <span className="text-xs font-mono font-semibold text-[#8E3D1B] bg-[#F3E2D4] border border-[#DFB99F] px-2.5 py-0.5 rounded-full">
                  50×70 mm Termal
                </span>
              </div>

              {/* Product Selector */}
              <div className="space-y-2">
                <label htmlFor={productSelectId} className="block text-xs font-mono font-semibold text-[#6E5148] uppercase">
                  Katalogdan Ürün Seç
                </label>
                <select
                  id={productSelectId}
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  disabled={catalogLoading}
                  className="w-full bg-[#FBF6EC] border border-[#E2D3BD] rounded-xl px-3.5 py-2.5 text-sm text-[#3B1E1A] focus:outline-none focus:border-[#B4532A] transition-colors"
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
                <label htmlFor={productNameId} className="block text-xs font-mono font-semibold text-[#6E5148] uppercase">
                  Etiketteki Ekmek Adı (Büyük Başlık)
                </label>
                <input
                  id={productNameId}
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Örn: Taş Değirmen Karakılçık"
                  className="w-full bg-[#FBF6EC] border border-[#E2D3BD] rounded-xl px-3.5 py-2.5 text-sm font-serif font-bold text-[#3B1E1A] placeholder:text-[#6E5148]/60 focus:outline-none focus:border-[#B4532A] transition-colors"
                />
              </div>

              {/* Slug Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor={slugId} className="text-xs font-mono font-semibold text-[#6E5148] uppercase">
                    Ürün Slug&apos;ı (QR Hedefi)
                  </label>
                  <span className="text-xs font-mono text-[#6E5148]">
                    /e/{"{slug}"}
                  </span>
                </div>
                <input
                  id={slugId}
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="Örn: karakilcik-36-saat"
                  className="w-full bg-[#FBF6EC] border border-[#E2D3BD] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#3B1E1A] placeholder:text-[#6E5148]/60 focus:outline-none focus:border-[#B4532A] transition-colors"
                />
              </div>

              {/* Optional Tagline Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor={taglineId} className="text-xs font-mono font-semibold text-[#6E5148] uppercase">
                    İsteğe Bağlı Tek Satır (Alt Bilgi)
                  </label>
                  <span className="text-xs font-mono text-[#6E5148]">
                    Opsiyonel
                  </span>
                </div>
                <input
                  id={taglineId}
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Örn: 36 saat soğuk fermantasyon"
                  className="w-full bg-[#FBF6EC] border border-[#E2D3BD] rounded-xl px-3.5 py-2.5 text-sm text-[#3B1E1A] placeholder:text-[#6E5148]/60 focus:outline-none focus:border-[#B4532A] transition-colors"
                />
              </div>

              {/* Point of Sale Ref Code */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor={refInputId} className="text-xs font-mono font-semibold text-[#6E5148] uppercase">
                    Satış Noktası / Şarküteri Kodu (Ref)
                  </label>
                  <span className="text-xs font-mono text-[#6E5148]">
                    3–6 harf/rakam (örn: kuzu)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id={refInputId}
                    type="text"
                    value={rawRef}
                    onChange={(e) => setRawRef(e.target.value)}
                    placeholder="kuzu, kafe1..."
                    className="flex-1 bg-[#FBF6EC] border border-[#E2D3BD] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#3B1E1A] placeholder:text-[#6E5148]/60 focus:outline-none focus:border-[#B4532A] transition-colors"
                  />
                  {refCode && (
                    <div className="px-3 py-2 rounded-xl bg-[#E5EFE7] border border-[#B4D3BC] text-[#1D5130] text-xs font-mono font-semibold flex items-center gap-1.5 shrink-0">
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>?n={refCode}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-[#6E5148] font-sans">
                  Şarküteri veya kafe kodu girildiğinde QR okutma sayısı o nokta üzerinden ölçülür.
                </p>
              </div>
            </div>

            {/* Card 2: Baskı Adedi & Hızlı Seçim */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2D3BD] shadow-sm space-y-4">
              <label htmlFor={countInputId} className="font-serif font-bold text-[#3B1E1A] text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
                Baskı Adedi
              </label>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    id={countInputId}
                    type="number"
                    min={1}
                    max={100}
                    value={count}
                    onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                    className="w-24 bg-[#FBF6EC] border border-[#E2D3BD] rounded-xl px-3.5 py-2.5 text-center font-mono tabular-nums font-bold text-base text-[#3B1E1A] focus:outline-none focus:border-[#B4532A]"
                  />
                  <span className="text-xs font-mono text-[#6E5148]">Adet</span>
                </div>

                {/* Quick Count Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 5, 10, 20, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      aria-pressed={count === num}
                      onClick={() => setCount(num)}
                      className={`px-3 py-1.5 rounded-xl font-mono tabular-nums text-xs transition-colors ${
                        count === num
                          ? "bg-[#B4532A] text-white font-bold shadow-sm"
                          : "bg-[#FBF6EC] border border-[#E2D3BD] text-[#3B1E1A] hover:bg-[#F1E6D2]"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 3: Yazıcı Kalibrasyonu (X / Y Kaydırma) */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2D3BD] shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-[#E2D3BD] pb-3">
                <span className="font-serif font-bold text-[#3B1E1A] text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
                  Yazıcı Hizalama &amp; Kalibrasyon (Offset)
                </span>
                <button
                  type="button"
                  onClick={resetOffset}
                  className="text-xs font-mono font-semibold text-[#6E5148] hover:text-[#8E3D1B] flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  <span>Sıfırla</span>
                </button>
              </div>

              <p className="text-xs text-[#6E5148] font-sans leading-relaxed">
                Termal rulo etiket yazıcısının mekanik baskı sapmasını milimetrik olarak dengeler. Ayarlar bu cihazda saklanır.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Horizontal (X) */}
                <div className="p-4 rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <label htmlFor={offsetXId} className="text-[#6E5148]">Yatay Kaydırma (X):</label>
                    <span className="font-bold text-[#8E3D1B] tabular-nums">{offset.x.toFixed(1)} mm</span>
                  </div>
                  <input
                    id={offsetXId}
                    type="range"
                    min={-5}
                    max={5}
                    step={0.5}
                    value={offset.x}
                    onChange={(e) => setOffset((prev) => ({ ...prev, x: Number(e.target.value) }))}
                    className="w-full accent-[#B4532A] cursor-pointer"
                  />
                  <div className="flex justify-between text-xs font-mono text-[#6E5148]">
                    <span>-5 mm (Sola)</span>
                    <span>0 mm</span>
                    <span>+5 mm (Sağa)</span>
                  </div>
                </div>

                {/* Vertical (Y) */}
                <div className="p-4 rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <label htmlFor={offsetYId} className="text-[#6E5148]">Dikey Kaydırma (Y):</label>
                    <span className="font-bold text-[#8E3D1B] tabular-nums">{offset.y.toFixed(1)} mm</span>
                  </div>
                  <input
                    id={offsetYId}
                    type="range"
                    min={-5}
                    max={5}
                    step={0.5}
                    value={offset.y}
                    onChange={(e) => setOffset((prev) => ({ ...prev, y: Number(e.target.value) }))}
                    className="w-full accent-[#B4532A] cursor-pointer"
                  />
                  <div className="flex justify-between text-xs font-mono text-[#6E5148]">
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
            <div className="p-6 rounded-3xl bg-white border border-[#E2D3BD] shadow-sm space-y-6 flex flex-col items-center">
              <div className="w-full flex items-center justify-between border-b border-[#E2D3BD] pb-3">
                <span className="font-serif font-bold text-[#3B1E1A] text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
                  Canlı Etiket Önizleme
                </span>
                <span className="text-xs font-mono tabular-nums text-[#6E5148]">
                  50 mm × 70 mm
                </span>
              </div>

              {/* Realistic 50mm x 70mm white label preview on warm linen mat */}
              <div className="p-7 rounded-2xl bg-[#EFE3CE] border border-[#E2D3BD] shadow-inner flex flex-col items-center">
                <div className="shadow-lg rounded-sm overflow-hidden border border-[#D3C0A5] ring-2 ring-[#3B1E1A]/5 bg-white">
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
                <div className="text-xs font-mono text-[#6E5148] mt-4 flex items-center gap-2">
                  <span>Gerçek Ölçek: 5×7 cm</span>
                  <span aria-hidden="true">·</span>
                  <span>Termal S/B Çıktı</span>
                </div>
              </div>

              {/* Target Link Info */}
              <div className="w-full p-4 rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-[#6E5148] text-xs">
                  <span>QR KOD HEDEF ADRESİ:</span>
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#8E3D1B] font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <span>Test Et</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E2D3BD] text-[#3B1E1A] text-xs break-all select-all font-mono">
                  {targetUrl}
                </div>
                <div className="text-xs text-[#6E5148] leading-relaxed font-sans pt-1">
                  Karekod tarandığında önce <span className="font-mono font-semibold text-[#3B1E1A]">/e/{slug}</span> iniş rotasına uğrayarak funnel metriği kaydeder, ardından ürün sayfasına yönlenir.
                </div>
              </div>

              {/* Print Action */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={generatingQr || !qrDataUrl}
                className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-[#B4532A] hover:bg-[#9C4421] text-white font-serif font-bold text-base shadow-sm transition-colors disabled:opacity-50"
              >
                <Printer className="w-5 h-5" aria-hidden="true" />
                <span className="font-mono tabular-nums">Etiketleri Yazdır ({count} Adet)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Dedicated Print Area (Only visible when window.print() is called) */}
      <div id="ekmeklab-thermal-print-area" className="hidden print:block bg-white text-black overflow-visible">
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
