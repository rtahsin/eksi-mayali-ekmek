"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ListOrdered,
  Plus,
  Search,
  Pencil,
  X,
  Save,
  Loader2,
  Archive,
  RotateCcw,
  CalendarDays,
  Package,
  Tag,
  FolderTree,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronDown,
  Camera,
  ImageIcon,
  Lock,
  Layers,
  Film,
  RotateCw,
  Scissors,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET } from "@/lib/bake/log";
import { prepareTransparentAsset, shrinkPhoto } from "@/lib/media/shrinkPhoto";
import type { ExtendedProduct, MasterclassDetail, ProductCategoryInfo, ProductShowcaseMedia } from "@/types";
import { applyCategoryChange, emptyProductForm, productToForm, useAdminCatalog, type ProductForm } from "@/hooks/useAdminCatalog";
import { isAccompanimentCategory } from "@/lib/products/grouping";
import { isPlaceholderImageUrl } from "@/lib/products/map";
import { formatTrDate, istanbulToday } from "@/lib/time/istanbul";
import { upcomingSaleDates } from "@/lib/ordering/saleDates";
import { productBadges } from "@/lib/products/badges";
import { getErrorMessage } from "@/lib/utils/error";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { hasCapability } from "@/lib/security/capabilities";

const inputCls =
  "w-full bg-[#FBF6EC] border border-[#E2D3BD] rounded-xl px-3 py-2 text-sm text-[#3B1E1A] placeholder:text-[#6E5148]/65 focus:outline-none focus:border-[#B4532A]";
const tl = (v: number) => `${v.toLocaleString("tr-TR")} ₺`;

const QUICK_WEIGHT_CHIPS: ReadonlyArray<{ label: string; weight: number; weightUnit: ProductForm["weightUnit"] }> = [
  { label: "500 g", weight: 500, weightUnit: "g" },
  { label: "850 g", weight: 850, weightUnit: "g" },
  { label: "1 kg", weight: 1, weightUnit: "kg" },
  { label: "3 L", weight: 3, weightUnit: "l" },
  { label: "5 L", weight: 5, weightUnit: "l" },
  { label: "10 adet", weight: 10, weightUnit: "adet" },
  { label: "1 adet", weight: 1, weightUnit: "adet" },
];

const CATEGORY_PRESETS: ReadonlyArray<{ id: string; name: string }> = [
  { id: "mandira", name: "Mandıra & Süt Ürünleri" },
  { id: "sarkuteri", name: "Şarküteri & Kahvaltılık" },
  { id: "gurme", name: "Gurme Kiler" },
];

export default function AdminProductsPage() {
  const { adminUser } = useAdminAuth();
  const canManageProducts = hasCapability(adminUser?.role, "products.manage");

  const { products, categories, loading, error, saveProduct, archiveProduct, quickUpdate, saveCategory, deleteCategory } =
    useAdminCatalog();

  const [tab, setTab] = useState<"products" | "categories">("products");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<ProductForm | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return products
      .filter((p) => (showArchived ? p.isActive === false : p.isActive !== false))
      .filter((p) => categoryFilter === "all" || p.category === categoryFilter)
      .filter((p) => !q || p.name.toLocaleLowerCase("tr-TR").includes(q));
  }, [products, query, categoryFilter, showArchived]);

  const runQuick = async (p: ExtendedProduct, patch: Partial<ProductForm>) => {
    setBusyId(p.id);
    setListError(null);
    try {
      await quickUpdate(p, patch);
    } catch (err: unknown) {
      setListError(`${p.name}: ${getErrorMessage(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  if (!canManageProducts) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white border border-[#E2D3BD] rounded-2xl p-6 text-center space-y-3 shadow-sm">
        <div className="w-11 h-11 rounded-xl bg-[#F3E2D4] border border-[#DFB99F] text-[#8E3D1B] flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5" aria-hidden="true" />
        </div>
        <h1 className="font-serif text-xl font-bold text-[#3B1E1A]">Yetki Gerekli</h1>
        <p className="text-sm text-[#6E5148]">
          Ürün ve kategori yönetimine yalnızca yönetici hesapları erişebilir.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs font-bold transition-colors"
        >
          Komuta Merkezine Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-16">
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E2D3BD] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3B1E1A] font-serif">Ürünler</h1>
          <p className="text-[#6E5148] text-xs mt-1">
            Fiyat, kampanya, satış günleri, paketler ve kategoriler. Değişiklikler vitrinde en geç 1 dakikada görünür.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab(tab === "products" ? "categories" : "products")}
            className="px-4 py-2.5 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            {tab === "products" ? <FolderTree className="w-4 h-4" aria-hidden="true" /> : <Package className="w-4 h-4" aria-hidden="true" />}
            {tab === "products" ? "Kategoriler" : "Ürünler"}
          </button>
          {tab === "products" && (
            <button
              type="button"
              onClick={() => setEditing(emptyProductForm(categoryFilter !== "all" ? categoryFilter : (categories[0]?.id ?? "bread")))}
              className="px-4 py-2.5 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> Yeni ürün
            </button>
          )}
        </div>
      </div>

      {(error || listError) && (
        <div role="alert" className="p-3 rounded-xl bg-[#FCECE9] border border-[#E7B7AF] text-xs font-medium text-[#7D2114] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" /> {listError ?? error}
        </div>
      )}

      {tab === "categories" ? (
        <CategoryManager categories={categories} products={products} onSave={saveCategory} onDelete={deleteCategory} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#6E5148] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                aria-label="Ürün ara"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ürün ara…"
                className="w-full bg-white border border-[#E2D3BD] rounded-xl pl-9 pr-3 py-2 text-sm text-[#3B1E1A] placeholder:text-[#6E5148]/65 focus:outline-none focus:border-[#B4532A]"
              />
            </div>
            <select
              aria-label="Kategori filtresi"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-56 bg-white border border-[#E2D3BD] rounded-xl px-3 py-2 text-sm text-[#3B1E1A] focus:outline-none focus:border-[#B4532A]"
            >
              <option value="all">Tüm kategoriler</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-pressed={showArchived}
              onClick={() => setShowArchived(!showArchived)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border flex items-center gap-2 transition-colors ${
                showArchived
                  ? "bg-[#3B1E1A] border-[#3B1E1A] text-white"
                  : "bg-white border-[#E2D3BD] text-[#6E5148] hover:text-[#3B1E1A]"
              }`}
            >
              <Archive className="w-4 h-4" aria-hidden="true" /> {showArchived ? "Arşiv" : "Arşivi göster"}
            </button>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center text-[#6E5148] text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#B4532A]" aria-hidden="true" /> Yükleniyor…
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center text-[#6E5148] text-sm border border-dashed border-[#E2D3BD] bg-white rounded-2xl">
              {showArchived ? "Arşivde ürün yok." : "Ürün bulunamadı."}
            </div>
          ) : (
            <ul className="space-y-2">
              {visible.map((p) => {
                const needsPhoto = isPlaceholderImageUrl(p.imageUrl);
                return (
                  <li key={p.id} className="p-3 rounded-2xl bg-white border border-[#E2D3BD] shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {needsPhoto ? (
                        <div
                          className="w-14 h-14 rounded-xl bg-[#FBF6EC] border border-dashed border-[#D3C0A5] flex items-center justify-center shrink-0 text-[#6E5148]"
                          title="Fotoğraf bekliyor"
                        >
                          <Camera className="w-5 h-5" aria-hidden="true" />
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={p.imageUrl} alt={p.name} className="w-14 h-14 rounded-xl object-cover bg-[#F1E6D2] border border-[#E2D3BD] shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[#3B1E1A] text-sm leading-snug">{p.name}</div>
                        <div className="text-xs text-[#6E5148] flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                          <span>{categoryName(p.category)}</span>
                          <span className="font-mono tabular-nums font-semibold text-[#3B1E1A]">{tl(p.price)}</span>
                          {p.compareAtPrice ? <span className="line-through text-[#6E5148]/70 font-mono tabular-nums">{tl(p.compareAtPrice)}</span> : null}
                          {needsPhoto && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[#FEF3D6] text-[#7A4A0B] border border-[#E8C587] text-xs inline-flex items-center gap-1 font-medium">
                              <Camera className="w-3 h-3" aria-hidden="true" /> Fotoğraf bekliyor
                            </span>
                          )}
                          {productBadges(p).map((b) => (
                            <span key={b.label} className="px-1.5 py-0.5 rounded-md bg-[#F3E2D4] text-[#8E3D1B] border border-[#DFB99F] text-xs font-medium">
                              {b.label}
                            </span>
                          ))}
                          {p.dailyLimit !== null && p.dailyLimit !== undefined && (
                            <span className="text-xs text-[#6E5148] font-mono tabular-nums">günde en fazla {p.dailyLimit}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 shrink-0">
                      {p.isActive !== false ? (
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => runQuick(p, { isAvailable: p.isAvailable === false })}
                          className={`px-2.5 py-2 rounded-xl text-xs font-bold border min-w-[76px] transition-colors ${
                            p.isAvailable === false
                              ? "bg-[#FCECE9] text-[#7D2114] border-[#E7B7AF]"
                              : "bg-[#E5EFE7] text-[#1D5130] border-[#B4D3BC]"
                          }`}
                          title="Tükendi / satışta"
                        >
                          {busyId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" aria-hidden="true" /> : p.isAvailable === false ? "Tükendi" : "Satışta"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => runQuick(p, { isActive: true })}
                          className="px-2.5 py-2 rounded-xl text-xs font-bold border bg-[#F1E6D2] hover:bg-[#E2D3BD] text-[#3B1E1A] border-[#E2D3BD] flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Geri al
                        </button>
                      )}
                      <Link
                        href={`/admin/urunler/${encodeURIComponent(p.id)}/adimlar`}
                        aria-label={`${p.name} yapılış adımları`}
                        title="Nasıl yapılıyor adımları"
                        className="p-2.5 rounded-xl bg-[#FBF6EC] hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] transition-colors"
                      >
                        <ListOrdered className="w-4 h-4" aria-hidden="true" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditing(productToForm(p))}
                        aria-label={`${p.name} düzenle`}
                        className="p-2.5 rounded-xl bg-[#FBF6EC] hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] transition-colors"
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {editing && (
        <ProductEditor
          initial={editing}
          products={products}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={async (form) => {
            await saveProduct(form);
            setEditing(null);
          }}
          onArchive={
            editing.id
              ? async () => {
                  await archiveProduct(editing.id as string);
                  setEditing(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

/* ─────────────────────────── Ürün düzenleyici ─────────────────────────── */

function ProductEditor({
  initial,
  products,
  categories,
  onClose,
  onSave,
  onArchive,
}: {
  initial: ProductForm;
  products: ExtendedProduct[];
  categories: ProductCategoryInfo[];
  onClose: () => void;
  onSave: (form: ProductForm) => Promise<void>;
  onArchive?: () => Promise<void>;
}) {
  const [form, setForm] = useState<ProductForm>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newDateLimit, setNewDateLimit] = useState("");
  const [bundlePick, setBundlePick] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [showShowcase, setShowShowcase] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const pointerDownOutsideRef = useRef(false);
  const titleId = useId();
  const today = istanbulToday();
  const isAccomp = isAccompanimentCategory(form.category);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const updateShowcase = (updater: (prev: ProductShowcaseMedia) => ProductShowcaseMedia) => {
    setForm((f) => {
      const prevMasterclass = f.masterclass ?? {};
      const prevShowcase = prevMasterclass.showcase ?? {};
      const nextShowcase = updater(prevShowcase);
      const hasValues = Boolean(
        nextShowcase.cutoutUrl ||
          nextShowcase.crumbUrl ||
          (nextShowcase.spinFrameUrls && nextShowcase.spinFrameUrls.length > 0) ||
          nextShowcase.spinFramesUrlPattern ||
          nextShowcase.spinFrameCount ||
          nextShowcase.ambientVideoUrl ||
          nextShowcase.specularTone,
      );
      const nextMasterclass: MasterclassDetail = { ...prevMasterclass };
      if (hasValues) {
        nextMasterclass.showcase = nextShowcase;
      } else {
        delete nextMasterclass.showcase;
      }
      return {
        ...f,
        masterclass: Object.keys(nextMasterclass).length > 0 ? nextMasterclass : null,
      };
    });
  };
  const others = products.filter((p) => p.id !== form.id && p.isActive !== false);
  const nameOf = (id: string) => products.find((p) => p.id === id)?.name ?? id;

  const bundleSeparateTotal = form.bundleItems.reduce(
    (sum, b) => sum + (products.find((p) => p.id === b.productId)?.price ?? 0) * b.quantity,
    0
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await onSave(form);
    } catch (error: unknown) {
      setErr(getErrorMessage(error));
      setSaving(false);
    }
  };

  const confirmArchive = async () => {
    if (!onArchive) return;
    setArchiveConfirmOpen(false);
    setSaving(true);
    try {
      await onArchive();
    } catch (error: unknown) {
      setErr(getErrorMessage(error));
      setSaving(false);
    }
  };

  const isPointerOutsideDialog = (e: React.PointerEvent<HTMLDialogElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    );
  };

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={(e) => {
          e.preventDefault();
          if (!archiveConfirmOpen) onClose();
        }}
        onPointerDown={(e) => {
          pointerDownOutsideRef.current = e.target === e.currentTarget && isPointerOutsideDialog(e);
        }}
        onPointerUp={(e) => {
          if (!archiveConfirmOpen && e.target === e.currentTarget && pointerDownOutsideRef.current && isPointerOutsideDialog(e)) {
            onClose();
          }
          pointerDownOutsideRef.current = false;
        }}
        className="m-auto w-full sm:w-[calc(100%-2rem)] sm:max-w-2xl h-full sm:h-auto max-h-full sm:max-h-[92dvh] bg-white sm:rounded-2xl border border-[#E2D3BD] text-[#3B1E1A] p-0 shadow-2xl overflow-hidden backdrop:bg-[#3B1E1A]/45 backdrop:backdrop-blur-[2px] backdrop:overflow-hidden backdrop:overscroll-contain"
      >
        <form onSubmit={submit} className="w-full h-full flex flex-col max-h-full sm:max-h-[92dvh]">
          <div className="p-4 border-b border-[#E2D3BD] bg-[#FBF6EC] flex items-center justify-between shrink-0">
            <h2 id={titleId} className="font-serif text-lg font-bold text-[#3B1E1A]">
              {form.id ? "Ürünü düzenle" : "Yeni ürün"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="p-2 rounded-lg text-[#6E5148] hover:text-[#3B1E1A] hover:bg-[#F1E6D2] transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-6">
            {/* Temel */}
            <Section title="Temel bilgiler">
              <Field label="Ürün adı">
                <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
              </Field>
              <Field label={isAccomp ? "Açıklama · Doku, Kıvam & Lezzet Notları" : "Açıklama"}>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder={
                    isAccomp
                      ? "Örn: Üstü kalın kaymak tabakalı, kaşıkta dağılmayan sıkı dokulu ve hafif ekşimsi aromalı geleneksel yoğurt."
                      : "Örn: Kalın karamelize kabuklu, nemli gözenekli iç dokuya ve dengeli ekşi maya aromasına sahip taş fırın somunu."
                  }
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kategori">
                  <select
                    value={form.category}
                    onChange={(e) => setForm(applyCategoryChange(form, e.target.value))}
                    className={inputCls}
                  >
                    {!categories.some((c) => c.id === form.category) && (
                      <option value={form.category}>{form.category}</option>
                    )}
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.isVisible ? "" : " (gizli)"}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Sıra" hint="Küçük olan önce görünür">
                  <input
                    type="number"
                    min={0}
                    value={form.displayOrder}
                    onChange={(e) => set("displayOrder", Number(e.target.value))}
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </Field>
                <Field label="Fiyat (₺)">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={form.price}
                    onChange={(e) => set("price", Number(e.target.value))}
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </Field>
                <Field label="Kampanya: eski fiyat (₺)" hint="Doluysa vitrinde üstü çizili görünür">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.compareAtPrice ?? ""}
                    onChange={(e) => set("compareAtPrice", e.target.value === "" ? null : Number(e.target.value))}
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </Field>
                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <Field label="Ağırlık / miktar">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={0}
                        value={form.weight}
                        onChange={(e) => set("weight", Number(e.target.value))}
                        className={`${inputCls} font-mono tabular-nums`}
                      />
                      <select
                        aria-label="Ağırlık birimi"
                        value={form.weightUnit}
                        onChange={(e) => set("weightUnit", e.target.value as ProductForm["weightUnit"])}
                        className={`${inputCls} w-24`}
                      >
                        {(["g", "kg", "ml", "l", "adet"] as const).map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Field>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Hızlı gramaj ve birim seçimi">
                    {QUICK_WEIGHT_CHIPS.map((chip) => {
                      const active = form.weight === chip.weight && form.weightUnit === chip.weightUnit;
                      return (
                        <button
                          key={chip.label}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setForm((f) => ({ ...f, weight: chip.weight, weightUnit: chip.weightUnit }))}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            active
                              ? "bg-[#B4532A] text-white border-[#B4532A] shadow-sm"
                              : "bg-[#FBF6EC] text-[#3B1E1A] border-[#E2D3BD] hover:bg-[#F1E6D2]"
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <span className="text-xs font-semibold text-[#3B1E1A] block">Fotoğraf</span>
                  <PhotoField value={form.imageUrl ?? null} onChange={(url) => set("imageUrl", url)} />
                  <span className="block text-xs text-[#6E5148]">Telefonda küçültülüp yüklenir; kaydedince ürüne bağlanır</span>
                </div>
              </div>
            </Section>

            {/* Satış Takvimi & Günleri (Birleşik, çelişkisiz tek bölüm) */}
            <Section title="Satış Takvimi & Günleri" icon={<CalendarDays className="w-4 h-4" aria-hidden="true" />}>
              {(() => {
                const hasWeekdays = Boolean(form.saleWeekdays && form.saleWeekdays.length > 0);
                const scheduleMode: "daily" | "weekdays" | "custom_dates" = hasWeekdays
                  ? "weekdays"
                  : form.availability === "dates"
                    ? "custom_dates"
                    : "daily";

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        aria-pressed={scheduleMode === "daily"}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            availability: "daily",
                            saleWeekdays: null,
                            saleDates: [],
                          }))
                        }
                        className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold border transition-colors min-h-[44px] ${
                          scheduleMode === "daily"
                            ? "bg-[#B4532A] text-white border-[#B4532A] shadow-sm"
                            : "bg-[#FBF6EC] text-[#6E5148] border-[#E2D3BD] hover:text-[#3B1E1A]"
                        }`}
                      >
                        Her gün
                      </button>

                      <button
                        type="button"
                        aria-pressed={scheduleMode === "weekdays"}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            availability: "dates",
                            saleWeekdays: f.saleWeekdays && f.saleWeekdays.length > 0 ? f.saleWeekdays : [5],
                            saleDates: [],
                          }))
                        }
                        className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold border transition-colors min-h-[44px] ${
                          scheduleMode === "weekdays"
                            ? "bg-[#B4532A] text-white border-[#B4532A] shadow-sm"
                            : "bg-[#FBF6EC] text-[#6E5148] border-[#E2D3BD] hover:text-[#3B1E1A]"
                        }`}
                      >
                        Haftanın belirli günleri
                      </button>

                      <button
                        type="button"
                        aria-pressed={scheduleMode === "custom_dates"}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            availability: "dates",
                            saleWeekdays: null,
                          }))
                        }
                        className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold border transition-colors min-h-[44px] ${
                          scheduleMode === "custom_dates"
                            ? "bg-[#B4532A] text-white border-[#B4532A] shadow-sm"
                            : "bg-[#FBF6EC] text-[#6E5148] border-[#E2D3BD] hover:text-[#3B1E1A]"
                        }`}
                      >
                        Seçili özel tarihler
                      </button>
                    </div>

                    {scheduleMode === "weekdays" && form.saleWeekdays && (
                      <div className="space-y-3 p-3.5 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD]">
                        <div>
                          <span className="text-xs font-semibold text-[#3B1E1A] block mb-2">
                            Taze Pişme / Satış Günleri (Pzt…Paz)
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: 1, label: "Pzt" },
                              { id: 2, label: "Sal" },
                              { id: 3, label: "Çar" },
                              { id: 4, label: "Per" },
                              { id: 5, label: "Cum" },
                              { id: 6, label: "Cmt" },
                              { id: 7, label: "Paz" },
                            ].map((day) => {
                              const selected = (form.saleWeekdays ?? []).includes(day.id);
                              return (
                                <button
                                  key={day.id}
                                  type="button"
                                  aria-pressed={selected}
                                  onClick={() => {
                                    const current = form.saleWeekdays ?? [];
                                    const updated = selected
                                      ? current.filter((x) => x !== day.id)
                                      : [...current, day.id].sort((a, b) => a - b);
                                    if (updated.length > 0) {
                                      setForm((f) => ({
                                        ...f,
                                        saleWeekdays: updated,
                                        availability: "dates",
                                        saleDates: [],
                                      }));
                                    } else {
                                      setForm((f) => ({
                                        ...f,
                                        saleWeekdays: null,
                                        availability: "daily",
                                        saleDates: [],
                                      }));
                                    }
                                  }}
                                  className={`min-w-[44px] min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center ${
                                    selected
                                      ? "bg-[#B4532A] text-white border-[#B4532A] shadow-sm"
                                      : "bg-white text-[#3B1E1A] border-[#E2D3BD] hover:bg-[#F1E6D2]"
                                  }`}
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {(() => {
                          const nextThree = upcomingSaleDates(form.saleWeekdays, today, 4).slice(0, 3);
                          return nextThree.length > 0 ? (
                            <div className="pt-2 border-t border-[#E2D3BD] flex items-center gap-2 flex-wrap text-xs text-[#6E5148]">
                              <span className="font-semibold text-[#3B1E1A]">Sıradaki Satış Günleri:</span>
                              {nextThree.map((d) => (
                                <span
                                  key={d}
                                  className="px-2 py-0.5 rounded-md bg-white border border-[#E2D3BD] text-[#8E3D1B] font-mono tabular-nums font-medium"
                                >
                                  {formatTrDate(d)}
                                </span>
                              ))}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {scheduleMode === "custom_dates" && (
                      <div className="space-y-2.5 p-3.5 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD]">
                        <div className="flex flex-wrap sm:flex-nowrap gap-2">
                          <input
                            type="date"
                            aria-label="Özel satış tarihi"
                            min={today}
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            className={`${inputCls} bg-white font-mono tabular-nums`}
                          />
                          <input
                            type="number"
                            aria-label="Tarih adet sınırı"
                            min={0}
                            value={newDateLimit}
                            onChange={(e) => setNewDateLimit(e.target.value)}
                            placeholder="adet (ops.)"
                            className={`${inputCls} bg-white w-28 font-mono tabular-nums`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newDate) return;
                              const rest = form.saleDates.filter((d) => d.date !== newDate);
                              set(
                                "saleDates",
                                [...rest, { date: newDate, limit: newDateLimit === "" ? null : Number(newDateLimit) }].sort(
                                  (a, b) => a.date.localeCompare(b.date)
                                )
                              );
                              setNewDate("");
                              setNewDateLimit("");
                            }}
                            className="min-h-[44px] px-4 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-bold shrink-0 transition-colors"
                          >
                            Ekle
                          </button>
                        </div>
                        {form.saleDates.filter((d) => d.date >= today).length === 0 ? (
                          <p className="text-xs text-[#7A4A0B] bg-[#FEF3D6] border border-[#E8C587] rounded-lg px-2.5 py-1.5">
                            Yaklaşan özel satış tarihi seçilmedi — ürün vitrinde &quot;Yakında&quot; görünür, tarih ekleyene kadar sipariş alınmaz.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {form.saleDates
                              .filter((d) => d.date >= today)
                              .map((d) => (
                                <span
                                  key={d.date}
                                  className="text-xs px-2.5 py-1 rounded-lg bg-[#F3E2D4] text-[#8E3D1B] border border-[#DFB99F] flex items-center gap-1.5 font-medium"
                                >
                                  {formatTrDate(d.date, "long")}
                                  {d.limit !== null ? ` · ${d.limit} adet` : ""}
                                  <button
                                    type="button"
                                    aria-label={`${d.date} tarihini kaldır`}
                                    onClick={() =>
                                      set(
                                        "saleDates",
                                        form.saleDates.filter((x) => x.date !== d.date)
                                      )
                                    }
                                    className="hover:text-[#3B1E1A]"
                                  >
                                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                                  </button>
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Günlük adet sınırı" hint="Boş = sınırsız">
                  <input
                    type="number"
                    min={0}
                    value={form.dailyLimit ?? ""}
                    onChange={(e) => set("dailyLimit", e.target.value === "" ? null : Number(e.target.value))}
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </Field>
                <Field label="En az kaç gün önceden" hint="0 = aynı gün">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={form.leadTimeDays}
                    onChange={(e) => set("leadTimeDays", Number(e.target.value))}
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </Field>
                <Field label="Fırın kapasitesinden" hint="Ekmek 1, eşlikçi 0, 3'lü paket 3">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.capacityUnits}
                    onChange={(e) => set("capacityUnits", Number(e.target.value))}
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </Field>
              </div>
              {isAccomp && (
                <div className="px-3 py-2 rounded-xl bg-[#E5EFE7] border border-[#B4D3BC] text-xs text-[#1D5130] font-medium">
                  Eşlikçi ürün: Taş fırın somun kapasitesini tüketmez (Kapasite payı = 0)
                </div>
              )}
            </Section>

            {/* Paket */}
            <Section title="Paket içeriği (isteğe bağlı)" icon={<Package className="w-4 h-4" aria-hidden="true" />}>
              <div className="flex gap-2">
                <select aria-label="Pakete eklenecek ürün" value={bundlePick} onChange={(e) => setBundlePick(e.target.value)} className={inputCls}>
                  <option value="">Pakete ürün ekle…</option>
                  {others.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({tl(p.price)})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!bundlePick) return;
                    const existing = form.bundleItems.find((b) => b.productId === bundlePick);
                    set(
                      "bundleItems",
                      existing
                        ? form.bundleItems.map((b) => (b.productId === bundlePick ? { ...b, quantity: b.quantity + 1 } : b))
                        : [...form.bundleItems, { productId: bundlePick, quantity: 1 }]
                    );
                    setBundlePick("");
                  }}
                  className="px-4 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-bold transition-colors shrink-0"
                >
                  Ekle
                </button>
              </div>
              {form.bundleItems.length > 0 && (
                <div className="space-y-1.5">
                  {form.bundleItems.map((b) => (
                    <div key={b.productId} className="flex items-center gap-2 text-sm text-[#3B1E1A]">
                      <input
                        type="number"
                        aria-label={`${nameOf(b.productId)} adedi`}
                        min={1}
                        value={b.quantity}
                        onChange={(e) =>
                          set(
                            "bundleItems",
                            form.bundleItems.map((x) => (x.productId === b.productId ? { ...b, quantity: Math.max(1, Number(e.target.value)) } : x))
                          )
                        }
                        className={`${inputCls} w-20 font-mono tabular-nums`}
                      />
                      <span className="flex-1">× {nameOf(b.productId)}</span>
                      <button
                        type="button"
                        aria-label="Kaldır"
                        onClick={() => set("bundleItems", form.bundleItems.filter((x) => x.productId !== b.productId))}
                        className="text-[#6E5148] hover:text-[#7D2114] p-1"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-[#6E5148]">
                    Ayrı ayrı toplam: <strong className="text-[#3B1E1A] font-mono tabular-nums">{tl(bundleSeparateTotal)}</strong>
                    {form.price > 0 && bundleSeparateTotal > form.price && (
                      <> · müşteri kazancı {tl(bundleSeparateTotal - form.price)} (eski fiyat alanına {tl(bundleSeparateTotal)} yazabilirsiniz)</>
                    )}
                  </p>
                </div>
              )}
            </Section>

            {/* Birlikte iyi gider */}
            <Section title="Birlikte iyi gider (sepette öneri, en fazla 6)" icon={<Tag className="w-4 h-4" aria-hidden="true" />}>
              <div className="flex flex-wrap gap-1.5">
                {others.map((p) => {
                  const on = form.crossSell.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        set("crossSell", on ? form.crossSell.filter((x) => x !== p.id) : form.crossSell.length < 6 ? [...form.crossSell, p.id] : form.crossSell)
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-xs border font-medium transition-colors ${
                        on
                          ? "bg-[#F3E2D4] text-[#8E3D1B] border-[#B4532A]/50 font-semibold"
                          : "bg-[#FBF6EC] text-[#6E5148] border-[#E2D3BD] hover:text-[#3B1E1A]"
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Durum */}
            <Section title="Durum">
              <div className="grid grid-cols-2 gap-2">
                <Toggle label="Vitrinde göster" on={form.isActive} onChange={(v) => set("isActive", v)} />
                <Toggle label="Satışta (tükenmedi)" on={form.isAvailable} onChange={(v) => set("isAvailable", v)} />
                <Toggle label="Öne çıkan" on={form.isPopular} onChange={(v) => set("isPopular", v)} />
                <Toggle label="Yeni" on={form.isNew} onChange={(v) => set("isNew", v)} />
              </div>
            </Section>

            {/* Detay */}
            <button
              type="button"
              aria-expanded={showDetails}
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs font-semibold text-[#8E3D1B] hover:text-[#3B1E1A] flex items-center gap-1 transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`} aria-hidden="true" />{" "}
              {isAccomp ? "Ürün sayfası detayları (içindekiler, üretici, saklama)" : "Ürün sayfası detayları (içerik, un, hikâye)"}
            </button>
            {showDetails && (
              <Section title="Ürün sayfası detayları">
                <Field label="İçindekiler" hint="Virgülle ayırın">
                  <input
                    value={form.ingredients.join(", ")}
                    placeholder={isAccomp ? "Örn: Çiğ inek sütü, yoğurt mayası" : "Örn: Atalık buğday unu, içme suyu, kaya tuzu, ekşi maya"}
                    onChange={(e) => set("ingredients", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                    className={inputCls}
                  />
                </Field>
                {!isAccomp && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Un türleri" hint="Virgülle ayırın">
                      <input
                        value={form.flourTypes.join(", ")}
                        onChange={(e) => set("flourTypes", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Hidrasyon (%)">
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={form.hydration ?? ""}
                        onChange={(e) => set("hydration", e.target.value === "" ? null : Number(e.target.value))}
                        className={`${inputCls} font-mono tabular-nums`}
                      />
                    </Field>
                  </div>
                )}
                {(
                  isAccomp
                    ? ([
                        [
                          "flourHeritage",
                          "Üretici & Kaynak Hikâyesi",
                          "Örn: Çatalca meralarında açık otlayan Jersey ineklerinden sabah sağımıyla gelen günlük çiğ süt.",
                        ],
                        [
                          "technique",
                          "Üretim & Hazırlık Yöntemi",
                          "Örn: Katkısız şirden mayası ile bakır kazanda yavaş pıhtılaştırma ve soğuk odada dinlendirme.",
                        ],
                        [
                          "pairingStorage",
                          "Nasıl Tüketilir & Saklanır?",
                          "Örn: +4°C buzdolabında cam kapta saklayın; kızarmış ekşi mayalı ekmek dilimiyle servis edin.",
                        ],
                      ] as const)
                    : ([
                        [
                          "flourHeritage",
                          "Unun ve mayanın hikâyesi",
                          "Örn: Kastamonu taş değirmen siyez unu ve atölyemizin 8 yıllık canlı ekşi mayası.",
                        ],
                        [
                          "technique",
                          "Fermantasyon & Pişirme Tekniği",
                          "Örn: +4°C'de 24 saat soğuk fermantasyon, 250°C taş tabanlı fırında buharlı pişirim.",
                        ],
                        [
                          "pairingStorage",
                          "Nasıl Tüketilir & Saklanır?",
                          "Örn: Oda sıcaklığında pamuklu bez torbada 4–5 gün; dilimleyerek dondurucuda 2 ay saklanabilir.",
                        ],
                      ] as const)
                ).map(([key, label, placeholder]) => (
                  <Field key={key} label={label}>
                    <textarea
                      rows={2}
                      value={form.masterclass?.[key] ?? ""}
                      placeholder={placeholder}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((f) => ({
                          ...f,
                          masterclass: { ...(f.masterclass ?? {}), [key]: val },
                        }));
                      }}
                      className={inputCls}
                    />
                  </Field>
                ))}
              </Section>
            )}

            {/* 3D Vitrin & Sahne Medyası */}
            <div className="pt-2 border-t border-[#E2D3BD]">
              <button
                type="button"
                aria-expanded={showShowcase}
                onClick={() => setShowShowcase((prev) => !prev)}
                className="w-full text-left text-xs font-semibold text-[#8E3D1B] hover:text-[#3B1E1A] flex items-center justify-between gap-2 transition-colors py-1"
              >
                <span className="flex items-center gap-1.5">
                  <ChevronDown className={`w-4 h-4 transition-transform ${showShowcase ? "rotate-180" : ""}`} aria-hidden="true" />
                  <Layers className="w-4 h-4" aria-hidden="true" />
                  <span>3D Vitrin &amp; Sahne Medyası (İsteğe Bağlı)</span>
                </span>
                {(() => {
                  const s = form.masterclass?.showcase;
                  const badges: string[] = [];
                  if (s?.cutoutUrl) badges.push("Dekupe");
                  if (s?.crumbUrl) badges.push("Kesit");
                  if (s?.spinFrameUrls?.length) badges.push(`${s.spinFrameUrls.length} kare`);
                  else if (s?.spinFrameCount && s?.spinFramesUrlPattern) badges.push(`${s.spinFrameCount} kare`);
                  if (s?.ambientVideoUrl) badges.push("Video");
                  if (s?.specularTone) badges.push(s.specularTone === "ember" ? "Sıcak Köz" : "Soğuk Buğu");
                  return badges.length > 0 ? (
                    <span className="px-2 py-0.5 rounded-md bg-[#F3E2D4] text-[#8E3D1B] border border-[#DFB99F] text-[11px] font-medium">
                      {badges.join(" · ")}
                    </span>
                  ) : null;
                })()}
              </button>
              {showShowcase && (
                <div className="mt-3">
                  <ShowcaseMediaSection
                    showcase={form.masterclass?.showcase}
                    isAccomp={isAccomp}
                    onUpdate={updateShowcase}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-[#E2D3BD] bg-[#FBF6EC] flex items-center justify-between gap-2 shrink-0">
            {onArchive && form.isActive ? (
              <button
                type="button"
                onClick={() => setArchiveConfirmOpen(true)}
                className="px-3 py-2.5 rounded-xl text-sm font-semibold text-[#7D2114] hover:bg-[#FCECE9] flex items-center gap-1.5 transition-colors"
              >
                <Archive className="w-4 h-4" aria-hidden="true" /> Arşivle
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              {err && (
                <span role="alert" className="text-xs font-medium text-[#7D2114] max-w-[220px]">
                  {err}
                </span>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white font-bold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />} Kaydet
              </button>
            </div>
          </div>
        </form>
      </dialog>

      <ConfirmDialog
        open={archiveConfirmOpen}
        title={`"${form.name}" arşivlensin mi?`}
        description="Ürün vitrinden kalkar, geçmiş sipariş kayıtları korunur."
        confirmLabel="Evet, Arşivle"
        onCancel={() => setArchiveConfirmOpen(false)}
        onConfirm={() => void confirmArchive()}
      />
    </>
  );
}

/* ─────────────────────────── Kategori yönetimi ─────────────────────────── */

function CategoryManager({
  categories,
  products,
  onSave,
  onDelete,
}: {
  categories: ProductCategoryInfo[];
  products: ExtendedProduct[];
  onSave: (c: Partial<ProductCategoryInfo> & { name: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, ProductCategoryInfo>>({});
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductCategoryInfo | null>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setErr(null);
    try {
      await fn();
    } catch (error: unknown) {
      setErr(getErrorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const missingPresets = CATEGORY_PRESETS.filter((preset) => !categories.some((c) => c.id === preset.id));

  return (
    <div className="space-y-3">
      {err && (
        <div role="alert" className="p-3 rounded-xl bg-[#FCECE9] border border-[#E7B7AF] text-xs font-medium text-[#7D2114] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" /> {err}
        </div>
      )}
      {categories.map((c) => {
        const d = drafts[c.id] ?? c;
        const count = products.filter((p) => p.category === c.id).length;
        const dirty = d.name !== c.name || d.displayOrder !== c.displayOrder || d.isVisible !== c.isVisible;
        return (
          <div key={c.id} className="p-3 rounded-2xl bg-white border border-[#E2D3BD] shadow-sm flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-[#6E5148] px-2 py-1 rounded-lg bg-[#FBF6EC] border border-[#E2D3BD]">{c.id}</span>
            <input
              aria-label={`${c.name} adı`}
              value={d.name}
              onChange={(e) => setDrafts({ ...drafts, [c.id]: { ...d, name: e.target.value } })}
              className={`${inputCls} flex-1 min-w-[160px]`}
            />
            <input
              type="number"
              min={0}
              value={d.displayOrder}
              onChange={(e) => setDrafts({ ...drafts, [c.id]: { ...d, displayOrder: Number(e.target.value) } })}
              className={`${inputCls} w-20 font-mono tabular-nums`}
              aria-label="Sıra"
            />
            <button
              type="button"
              onClick={() => setDrafts({ ...drafts, [c.id]: { ...d, isVisible: !d.isVisible } })}
              className="p-2.5 rounded-xl bg-[#FBF6EC] hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] transition-colors"
              aria-label={d.isVisible ? "Gizle" : "Göster"}
              title={d.isVisible ? "Vitrinde görünüyor" : "Vitrinde gizli"}
            >
              {d.isVisible ? <Eye className="w-4 h-4" aria-hidden="true" /> : <EyeOff className="w-4 h-4 text-[#6E5148]" aria-hidden="true" />}
            </button>
            <span className="text-xs font-mono tabular-nums text-[#6E5148] w-16 text-center">{count} ürün</span>
            <button
              type="button"
              disabled={!dirty || busy === c.id}
              onClick={() => run(c.id, () => onSave(d))}
              className="px-3 py-2.5 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs font-bold disabled:opacity-35 transition-colors"
            >
              {busy === c.id ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : "Kaydet"}
            </button>
            <button
              type="button"
              disabled={count > 0 || busy === c.id}
              onClick={() => setDeleteTarget(c)}
              className="p-2.5 rounded-xl text-[#6E5148] hover:text-[#7D2114] hover:bg-[#FCECE9] disabled:opacity-30 transition-colors"
              aria-label="Sil"
              title={count > 0 ? "İçinde ürün olan kategori silinemez; gizleyebilirsiniz" : "Sil"}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}

      <div className="flex gap-2">
        <input
          aria-label="Yeni kategori adı"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Yeni kategori adı (ör. Kampanyalar)"
          className={`${inputCls} bg-white`}
        />
        <button
          type="button"
          disabled={newName.trim().length < 2 || busy === "new"}
          onClick={() =>
            run("new", async () => {
              await onSave({ name: newName.trim(), displayOrder: categories.length + 1, isVisible: true });
              setNewName("");
            })
          }
          className="px-4 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-sm font-bold flex items-center gap-1 disabled:opacity-40 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Ekle
        </button>
      </div>

      {missingPresets.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-white border border-[#E2D3BD] shadow-sm space-y-2">
          <span className="text-xs font-semibold text-[#3B1E1A] block">
            Hızlı eşlikçi kategorileri (tek tıkla standart kategori koduyla eklenir):
          </span>
          <div className="flex flex-wrap gap-2">
            {missingPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  run(`preset-${preset.id}`, () =>
                    onSave({
                      id: preset.id,
                      name: preset.name,
                      displayOrder: categories.length + 1,
                      isVisible: true,
                    })
                  )
                }
                className="px-3 py-2 rounded-xl bg-[#FBF6EC] hover:bg-[#F1E6D2] border border-[#E2D3BD] text-xs font-semibold text-[#3B1E1A] flex items-center gap-1.5 disabled:opacity-40 transition-colors"
              >
                {busy === `preset-${preset.id}` ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B4532A]" aria-hidden="true" />
                ) : (
                  <Plus className="w-3.5 h-3.5 text-[#B4532A]" aria-hidden="true" />
                )}
                <span>{preset.name}</span>
                <span className="font-mono text-[#6E5148]">({preset.id})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget ? `"${deleteTarget.name}" silinsin mi?` : ""}
        description="Boş kategori kalıcı olarak kaldırılır."
        confirmLabel="Evet, Sil"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const targetId = deleteTarget.id;
          setDeleteTarget(null);
          void run(targetId, () => onDelete(targetId));
        }}
      />
    </div>
  );
}

/* ─────────────────────────── küçük parçalar ─────────────────────────── */

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const pointerDownOutsideRef = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  const isPointerOutside = (e: React.PointerEvent<HTMLDialogElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    );
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onPointerDown={(e) => {
        pointerDownOutsideRef.current = e.target === e.currentTarget && isPointerOutside(e);
      }}
      onPointerUp={(e) => {
        if (e.target === e.currentTarget && pointerDownOutsideRef.current && isPointerOutside(e)) {
          onCancel();
        }
        pointerDownOutsideRef.current = false;
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white border border-[#E2D3BD] text-[#3B1E1A] p-5 shadow-2xl backdrop:bg-[#3B1E1A]/45 backdrop:backdrop-blur-[2px] backdrop:overflow-hidden backdrop:overscroll-contain"
    >
      {open && (
        <div className="space-y-4">
          <div>
            <h3 id={titleId} className="font-serif text-base font-bold text-[#3B1E1A]">
              {title}
            </h3>
            <p className="text-xs text-[#6E5148] mt-1 leading-relaxed">{description}</p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              autoFocus
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-xs font-bold transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 rounded-xl bg-[#9B2C1F] hover:bg-[#7D2114] text-white text-xs font-bold transition-colors"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

type ShowcaseUploadKind = "cover" | "cutout" | "crumb" | "spin" | "video";

const MAX_SHOWCASE_VIDEO_BYTES = 16 * 1024 * 1024;
const SPIN_UPLOAD_BATCH_SIZE = 6;
const MAX_SPIN_FRAMES_COUNT = 72;

function resolveVideoMimeType(file: File): string | null {
  const mime = (file.type || "").split(";")[0].trim().toLowerCase();
  if (mime === "video/mp4" || mime === "video/webm" || mime === "video/quicktime") return mime;
  const name = (file.name || "").trim().toLowerCase();
  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".webm")) return "video/webm";
  if (name.endsWith(".mov")) return "video/quicktime";
  return null;
}

async function uploadProductMediaAsset(
  file: File,
  kind: ShowcaseUploadKind,
  contentTypeOverride?: string,
): Promise<string> {
  const contentType = contentTypeOverride ?? file.type;
  const res = await fetch("/api/admin/products/image-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: contentType, size: file.size, kind }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    path?: string;
    token?: string;
    url?: string;
    error?: string;
  };
  if (!res.ok || !body.path || !body.token || !body.url) {
    throw new Error(body.error || "Yükleme başlatılamadı");
  }
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase bağlantısı yok");
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .uploadToSignedUrl(body.path, body.token, file, { contentType });
  if (error) throw error;
  return body.url;
}

/** Kapak fotoğrafı: çek/seç → telefonda küçült → imzalı bağlantıyla media bucket'ına yükle. */
function PhotoField({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const hasRealPhoto = Boolean(value && !isPlaceholderImageUrl(value));

  const upload = async (picked: File | undefined) => {
    if (!picked) return;
    setBusy(true);
    setErr(null);
    try {
      const file = await shrinkPhoto(picked, "urun");
      const url = await uploadProductMediaAsset(file, "cover");
      onChange(url);
    } catch (error: unknown) {
      setErr(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {hasRealPhoto && value ? (
          // eslint-disable-next-line @next/next/no-img-element -- yüklenen kapak önizlemesi
          <img src={value} alt="Yüklenen ürün fotoğrafı önizlemesi" className="w-20 h-20 rounded-xl object-cover bg-[#F1E6D2] border border-[#E2D3BD] shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-[#FBF6EC] border border-dashed border-[#D3C0A5] flex items-center justify-center shrink-0">
            <ImageIcon className="w-6 h-6 text-[#6E5148]" aria-hidden="true" />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <label
            className={`h-11 px-4 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-sm font-bold flex items-center gap-2 transition-colors ${busy ? "opacity-60" : "cursor-pointer"}`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Camera className="w-4 h-4" aria-hidden="true" />}
            {busy ? "Yükleniyor…" : hasRealPhoto ? "Değiştir" : "Fotoğraf ekle"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {hasRealPhoto && !busy && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="h-11 px-3 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-semibold transition-colors"
            >
              Kaldır
            </button>
          )}
        </div>
      </div>
      {err && (
        <p role="alert" className="text-xs font-medium text-[#7D2114]">
          {err}
        </p>
      )}
    </div>
  );
}

function ShowcaseImageSlot({
  title,
  hint,
  kind,
  value,
  onChange,
}: {
  title: string;
  hint: string;
  kind: "cutout" | "crumb";
  value?: string;
  onChange: (url: string | undefined) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleFile = async (picked: File | undefined) => {
    if (!picked) return;
    setBusy(true);
    setErr(null);
    try {
      const prepared = await prepareTransparentAsset(picked, kind, 1000);
      const url = await uploadProductMediaAsset(prepared, kind);
      onChange(url);
    } catch (error: unknown) {
      setErr(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-3 rounded-xl bg-white border border-[#E2D3BD] space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-[#3B1E1A] block">{title}</span>
          <span className="text-xs text-[#6E5148] block">{hint}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- şeffaf vitrin katmanı önizlemesi
          <img
            src={value}
            alt={`${title} önizlemesi`}
            className="w-16 h-16 rounded-xl object-contain bg-[#F6EEDF] border border-[#E2D3BD] p-1 shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-[#F6EEDF] border border-dashed border-[#D3C0A5] flex items-center justify-center shrink-0 text-[#6E5148]">
            {kind === "cutout" ? (
              <Layers className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Scissors className="w-5 h-5" aria-hidden="true" />
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <label
            className={`min-h-[40px] px-3.5 py-2 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs font-bold flex items-center gap-1.5 transition-colors ${
              busy ? "opacity-60" : "cursor-pointer"
            }`}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Camera className="w-3.5 h-3.5" aria-hidden="true" />}
            {busy ? "Yükleniyor…" : value ? "Değiştir" : "Yükle"}
            <input
              type="file"
              accept="image/webp,image/png,image/jpeg,image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {value && !busy && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-xs font-semibold transition-colors"
            >
              Kaldır
            </button>
          )}
        </div>
      </div>
      {err && (
        <p role="alert" className="text-xs font-medium text-[#7D2114]">
          {err}
        </p>
      )}
    </div>
  );
}

function ShowcaseMediaSection({
  showcase,
  isAccomp,
  onUpdate,
}: {
  showcase?: ProductShowcaseMedia;
  isAccomp: boolean;
  onUpdate: (updater: (prev: ProductShowcaseMedia) => ProductShowcaseMedia) => void;
}) {
  const [spinProgress, setSpinProgress] = useState<{ done: number; total: number } | null>(null);
  const [spinErr, setSpinErr] = useState<string | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoErr, setVideoErr] = useState<string | null>(null);

  const spinUrls = showcase?.spinFrameUrls ?? [];
  const spinBusy = spinProgress !== null;

  const handleSpinFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setSpinErr(null);

    const sorted = Array.from(fileList).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
    );
    if (sorted.length > MAX_SPIN_FRAMES_COUNT) {
      setSpinErr(`En fazla ${MAX_SPIN_FRAMES_COUNT} döndürme karesi seçilebilir (seçilen: ${sorted.length}).`);
      return;
    }

    const total = sorted.length;
    const uploadedUrls: string[] = new Array<string>(total);
    let completed = 0;
    setSpinProgress({ done: 0, total });

    try {
      for (let start = 0; start < total; start += SPIN_UPLOAD_BATCH_SIZE) {
        const batch = sorted.slice(start, start + SPIN_UPLOAD_BATCH_SIZE);
        await Promise.all(
          batch.map(async (rawFile, offset) => {
            const index = start + offset;
            const prepared = await prepareTransparentAsset(
              rawFile,
              `spin-${String(index).padStart(2, "0")}`,
              1000,
            );
            const url = await uploadProductMediaAsset(prepared, "spin");
            uploadedUrls[index] = url;
            completed += 1;
            setSpinProgress({ done: completed, total });
          }),
        );
      }

      onUpdate((prev) => ({
        ...prev,
        spinFrameUrls: uploadedUrls,
        spinFramesUrlPattern: undefined,
        spinFrameCount: undefined,
      }));
    } catch (error: unknown) {
      setSpinErr(getErrorMessage(error));
    } finally {
      setSpinProgress(null);
    }
  };

  const handleVideoFile = async (picked: File | undefined) => {
    if (!picked) return;
    setVideoErr(null);

    const mime = resolveVideoMimeType(picked);
    if (!mime) {
      setVideoErr("Video MP4, WebM veya MOV formatında olmalıdır.");
      return;
    }
    if (picked.size > MAX_SHOWCASE_VIDEO_BYTES) {
      setVideoErr("Video boyutu en fazla 16 MB olabilir.");
      return;
    }

    setVideoBusy(true);
    try {
      const url = await uploadProductMediaAsset(picked, "video", mime);
      onUpdate((prev) => ({ ...prev, ambientVideoUrl: url }));
    } catch (error: unknown) {
      setVideoErr(getErrorMessage(error));
    } finally {
      setVideoBusy(false);
    }
  };

  const toneValue = showcase?.specularTone;
  const toneOptions: ReadonlyArray<{ id: "auto" | "ember" | "frost"; label: string }> = [
    { id: "auto", label: "Otomatik" },
    { id: "ember", label: "Sıcak Köz" },
    { id: "frost", label: "Soğuk Buğu" },
  ];

  return (
    <div className="p-3.5 rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ShowcaseImageSlot
          title="Dekupe Katman"
          hint="Şeffaf arka plansız WebP/PNG ürün görseli"
          kind="cutout"
          value={showcase?.cutoutUrl}
          onChange={(url) => onUpdate((prev) => ({ ...prev, cutoutUrl: url }))}
        />
        <ShowcaseImageSlot
          title="Bıçak Kesiti"
          hint="Kesilmiş iç doku ve gözenek fotoğrafı"
          kind="crumb"
          value={showcase?.crumbUrl}
          onChange={(url) => onUpdate((prev) => ({ ...prev, crumbUrl: url }))}
        />
      </div>

      {/* 360° Döndürme Kareleri */}
      <div className="p-3 rounded-xl bg-white border border-[#E2D3BD] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-[#3B1E1A] flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 text-[#8E3D1B]" aria-hidden="true" />
              360° Döndürme Kareleri
            </span>
            <span className="text-xs text-[#6E5148] block">
              Çoklu WebP/PNG kare seçin; dosya adına göre doğal sıralanıp 6&apos;lı paketlerle yüklenir.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-[#F6EEDF] border border-[#E2D3BD] text-xs font-mono tabular-nums text-[#3B1E1A]">
            {spinUrls.length > 0
              ? `${spinUrls.length} kare`
              : showcase?.spinFrameCount && showcase?.spinFramesUrlPattern
                ? `Desen · ${showcase.spinFrameCount} kare`
                : "0 kare"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {spinUrls[0] && (
            // eslint-disable-next-line @next/next/no-img-element -- 360 ilk kare önizlemesi
            <img
              src={spinUrls[0]}
              alt="360 döndürme ilk kare önizlemesi"
              className="w-12 h-12 rounded-lg object-contain bg-[#F6EEDF] border border-[#E2D3BD] p-0.5 shrink-0"
            />
          )}
          <label
            className={`min-h-[40px] px-3.5 py-2 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs font-bold flex items-center gap-1.5 transition-colors ${
              spinBusy ? "opacity-60" : "cursor-pointer"
            }`}
          >
            {spinBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {spinBusy && spinProgress
              ? `${spinProgress.done} / ${spinProgress.total} yüklendi`
              : spinUrls.length > 0
                ? "Kareleri Değiştir"
                : "Çoklu Kare Seç"}
            <input
              type="file"
              accept="image/webp,image/png,image/jpeg,image/*"
              multiple
              className="hidden"
              disabled={spinBusy}
              onChange={(e) => {
                void handleSpinFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {(spinUrls.length > 0 || showcase?.spinFramesUrlPattern || showcase?.spinFrameCount) && !spinBusy && (
            <button
              type="button"
              onClick={() =>
                onUpdate((prev) => ({
                  ...prev,
                  spinFrameUrls: undefined,
                  spinFramesUrlPattern: undefined,
                  spinFrameCount: undefined,
                }))
              }
              className="min-h-[40px] px-3 py-2 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-xs font-semibold transition-colors"
            >
              Temizle
            </button>
          )}
        </div>

        {spinBusy && spinProgress && (
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-[#F6EEDF] overflow-hidden border border-[#E2D3BD]">
              <div
                className="h-full bg-[#B4532A] transition-all duration-150"
                style={{ width: `${Math.round((spinProgress.done / Math.max(1, spinProgress.total)) * 100)}%` }}
              />
            </div>
            <p className="text-xs font-mono tabular-nums text-[#6E5148]">
              {spinProgress.done} / {spinProgress.total} yüklendi
            </p>
          </div>
        )}
        {spinErr && (
          <p role="alert" className="text-xs font-medium text-[#7D2114]">
            {spinErr}
          </p>
        )}
      </div>

      {/* Canlı Doku Videosu & Işık Tonu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white border border-[#E2D3BD] space-y-2">
          <div>
            <span className="text-xs font-semibold text-[#3B1E1A] flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-[#8E3D1B]" aria-hidden="true" />
              Canlı Doku Videosu
            </span>
            <span className="text-xs text-[#6E5148] block">MP4 veya WebM kısa klip (en fazla 16 MB)</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {showcase?.ambientVideoUrl && (
              <video
                src={showcase.ambientVideoUrl}
                muted
                loop
                playsInline
                controls
                className="w-24 h-14 rounded-lg object-cover bg-[#F6EEDF] border border-[#E2D3BD] shrink-0"
              />
            )}
            <label
              className={`min-h-[40px] px-3.5 py-2 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs font-bold flex items-center gap-1.5 transition-colors ${
                videoBusy ? "opacity-60" : "cursor-pointer"
              }`}
            >
              {videoBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Film className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {videoBusy ? "Yükleniyor…" : showcase?.ambientVideoUrl ? "Videoyu Değiştir" : "Video Yükle"}
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                disabled={videoBusy}
                onChange={(e) => {
                  void handleVideoFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {showcase?.ambientVideoUrl && !videoBusy && (
              <button
                type="button"
                onClick={() => onUpdate((prev) => ({ ...prev, ambientVideoUrl: undefined }))}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-xs font-semibold transition-colors"
              >
                Kaldır
              </button>
            )}
          </div>
          {videoErr && (
            <p role="alert" className="text-xs font-medium text-[#7D2114]">
              {videoErr}
            </p>
          )}
        </div>

        <div className="p-3 rounded-xl bg-white border border-[#E2D3BD] space-y-2">
          <div>
            <span className="text-xs font-semibold text-[#3B1E1A] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#8E3D1B]" aria-hidden="true" />
              Işık Tonu
            </span>
            <span className="text-xs text-[#6E5148] block">
              Otomatik seçim şu kategoride: {isAccomp ? "Soğuk Buğu" : "Sıcak Köz"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Işık Tonu">
            {toneOptions.map((opt) => {
              const active = (opt.id === "auto" && !toneValue) || toneValue === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onUpdate((prev) => ({
                      ...prev,
                      specularTone: opt.id === "auto" ? undefined : opt.id,
                    }))
                  }
                  className={`min-h-[40px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                    active
                      ? "bg-[#B4532A] text-white border-[#B4532A] shadow-sm"
                      : "bg-[#FBF6EC] text-[#3B1E1A] border-[#E2D3BD] hover:bg-[#F1E6D2]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E3D1B] flex items-center gap-1.5">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-[#3B1E1A]">{label}</span>
      {children}
      {hint && <span className="block text-xs text-[#6E5148]">{hint}</span>}
    </label>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`py-2.5 px-3 rounded-xl text-sm font-semibold border text-left transition-colors ${
        on
          ? "bg-[#E5EFE7] text-[#1D5130] border-[#B4D3BC]"
          : "bg-[#FBF6EC] text-[#6E5148] border-[#E2D3BD] hover:text-[#3B1E1A]"
      }`}
    >
      {on ? "✓ " : "○ "}
      {label}
    </button>
  );
}
