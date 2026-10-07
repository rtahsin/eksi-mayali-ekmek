"use client";

import React, { useMemo, useState } from "react";
import {
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
} from "lucide-react";
import type { ExtendedProduct, ProductCategoryInfo } from "@/types";
import { emptyProductForm, productToForm, useAdminCatalog, type ProductForm } from "@/hooks/useAdminCatalog";
import { formatTrDate, istanbulToday } from "@/lib/time/istanbul";
import { upcomingSaleDates } from "@/lib/ordering/saleDates";
import { productBadges } from "@/lib/products/badges";
import { getErrorMessage } from "@/lib/utils/error";

const inputCls =
  "w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500";
const tl = (v: number) => `${v.toLocaleString("tr-TR")} ₺`;

export default function AdminProductsPage() {
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

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-16">
      <div className="bg-stone-900/80 p-5 sm:p-6 rounded-2xl border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 font-serif">Ürünler</h1>
          <p className="text-stone-400 text-xs mt-1">
            Fiyat, kampanya, satış günleri, paketler ve kategoriler. Değişiklikler vitrinde en geç 1 dakikada görünür.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab(tab === "products" ? "categories" : "products")}
            className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-semibold flex items-center gap-2"
          >
            {tab === "products" ? <FolderTree className="w-4 h-4" /> : <Package className="w-4 h-4" />}
            {tab === "products" ? "Kategoriler" : "Ürünler"}
          </button>
          {tab === "products" && (
            <button
              type="button"
              onClick={() => setEditing(emptyProductForm(categories[0]?.id ?? "bread"))}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Yeni ürün
            </button>
          )}
        </div>
      </div>

      {(error || listError) && (
        <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {listError ?? error}
        </div>
      )}

      {tab === "categories" ? (
        <CategoryManager categories={categories} products={products} onSave={saveCategory} onDelete={deleteCategory} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ürün ara…"
                className={`${inputCls} pl-9`}
              />
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`${inputCls} sm:w-56`}>
              <option value="all">Tüm kategoriler</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border flex items-center gap-2 ${
                showArchived ? "bg-stone-700 border-stone-600 text-stone-100" : "bg-stone-950 border-stone-800 text-stone-400"
              }`}
            >
              <Archive className="w-4 h-4" /> {showArchived ? "Arşiv" : "Arşivi göster"}
            </button>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center text-stone-400 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center text-stone-500 text-sm border border-dashed border-stone-800 rounded-2xl">
              {showArchived ? "Arşivde ürün yok." : "Ürün bulunamadı."}
            </div>
          ) : (
            <ul className="space-y-2">
              {visible.map((p) => (
                <li key={p.id} className="p-3 rounded-2xl bg-stone-900/70 border border-stone-800 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover bg-stone-800 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-stone-100 text-sm truncate">{p.name}</div>
                    <div className="text-xs text-stone-400 flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                      <span>{categoryName(p.category)}</span>
                      <span className="font-mono text-stone-200">{tl(p.price)}</span>
                      {p.compareAtPrice ? <span className="line-through text-stone-500">{tl(p.compareAtPrice)}</span> : null}
                      {productBadges(p).map((b) => (
                        <span key={b.label} className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs">
                          {b.label}
                        </span>
                      ))}
                      {p.dailyLimit !== null && p.dailyLimit !== undefined && (
                        <span className="text-xs text-stone-500">günde en fazla {p.dailyLimit}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.isActive !== false ? (
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => runQuick(p, { isAvailable: p.isAvailable === false })}
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold border min-w-[76px] ${
                          p.isAvailable === false
                            ? "bg-red-500/10 text-red-300 border-red-500/30"
                            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        }`}
                        title="Tükendi / satışta"
                      >
                        {busyId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : p.isAvailable === false ? "Tükendi" : "Satışta"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => runQuick(p, { isActive: true })}
                        className="px-2.5 py-2 rounded-xl text-xs font-bold border bg-stone-800 text-stone-200 border-stone-700 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Geri al
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing(productToForm(p))}
                      aria-label={`${p.name} düzenle`}
                      className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
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
  const today = istanbulToday();

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm((f) => ({ ...f, [key]: value }));
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

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-stretch sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full sm:max-w-2xl bg-stone-900 sm:rounded-2xl border border-stone-800 flex flex-col max-h-full sm:max-h-[92vh]">
        <div className="p-4 border-b border-stone-800 flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-stone-100">{form.id ? "Ürünü düzenle" : "Yeni ürün"}</h2>
          <button type="button" onClick={onClose} aria-label="Kapat" className="p-2 rounded-lg text-stone-400 hover:text-stone-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Temel */}
          <Section title="Temel bilgiler">
            <Field label="Ürün adı">
              <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Açıklama">
              <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kategori">
                <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.isVisible ? "" : " (gizli)"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sıra" hint="Küçük olan önce görünür">
                <input type="number" min={0} value={form.displayOrder} onChange={(e) => set("displayOrder", Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Fiyat (₺)">
                <input type="number" min={0} step="0.01" required value={form.price} onChange={(e) => set("price", Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Kampanya: eski fiyat (₺)" hint="Doluysa vitrinde üstü çizili görünür">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.compareAtPrice ?? ""}
                  onChange={(e) => set("compareAtPrice", e.target.value === "" ? null : Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Ağırlık / miktar">
                <div className="flex gap-2">
                  <input type="number" min={0} value={form.weight} onChange={(e) => set("weight", Number(e.target.value))} className={inputCls} />
                  <select value={form.weightUnit} onChange={(e) => set("weightUnit", e.target.value as ProductForm["weightUnit"])} className={`${inputCls} w-24`}>
                    {(["g", "kg", "ml", "l", "adet"] as const).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
              <Field label="Görsel adresi" hint="Şimdilik bağlantı; yükleme Faz 4'te">
                <input value={form.imageUrl ?? ""} onChange={(e) => set("imageUrl", e.target.value || null)} placeholder="https://…" className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* Satış */}
          <Section title="Ne zaman satılır?" icon={<CalendarDays className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["daily", "Her gün"],
                  ["dates", "Sadece seçtiğim günlerde"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set("availability", v)}
                  className={`py-3 rounded-xl text-sm font-bold border ${
                    form.availability === v ? "bg-amber-500 text-stone-950 border-amber-500" : "bg-stone-950 text-stone-400 border-stone-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {form.availability === "dates" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input type="date" min={today} value={newDate} onChange={(e) => setNewDate(e.target.value)} className={inputCls} />
                  <input
                    type="number"
                    min={0}
                    value={newDateLimit}
                    onChange={(e) => setNewDateLimit(e.target.value)}
                    placeholder="adet (ops.)"
                    className={`${inputCls} w-28`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newDate) return;
                      const rest = form.saleDates.filter((d) => d.date !== newDate);
                      set(
                        "saleDates",
                        [...rest, { date: newDate, limit: newDateLimit === "" ? null : Number(newDateLimit) }].sort((a, b) =>
                          a.date.localeCompare(b.date)
                        )
                      );
                      setNewDate("");
                      setNewDateLimit("");
                    }}
                    className="px-4 rounded-xl bg-stone-800 text-stone-200 text-sm font-bold"
                  >
                    Ekle
                  </button>
                </div>
                {form.saleDates.filter((d) => d.date >= today).length === 0 ? (
                  <p className="text-xs text-amber-300">Yaklaşan satış günü yok — ürün vitrinde &quot;Yakında&quot; görünür, sipariş alınmaz.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {form.saleDates
                      .filter((d) => d.date >= today)
                      .map((d) => (
                        <span key={d.date} className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-200 border border-amber-500/20 flex items-center gap-1.5">
                          {formatTrDate(d.date, "long")}
                          {d.limit !== null ? ` · ${d.limit} adet` : ""}
                          <button type="button" aria-label="Kaldır" onClick={() => set("saleDates", form.saleDates.filter((x) => x.date !== d.date))}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Günlük adet sınırı" hint="Boş = sınırsız">
                <input
                  type="number"
                  min={0}
                  value={form.dailyLimit ?? ""}
                  onChange={(e) => set("dailyLimit", e.target.value === "" ? null : Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="En az kaç gün önceden" hint="0 = aynı gün">
                <input type="number" min={0} max={30} value={form.leadTimeDays} onChange={(e) => set("leadTimeDays", Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Fırın kapasitesinden" hint="Ekmek 1, eşlikçi 0, 3'lü paket 3">
                <input type="number" min={0} max={100} value={form.capacityUnits} onChange={(e) => set("capacityUnits", Number(e.target.value))} className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* Satış Günleri (I-06) */}
          <Section title="Satış Günleri" icon={<CalendarDays className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  set("saleWeekdays", null);
                  set("availability", "daily");
                }}
                className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold border transition-colors min-h-[44px] ${
                  !form.saleWeekdays || form.saleWeekdays.length === 0
                    ? "bg-amber-500 text-stone-950 border-amber-500"
                    : "bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700"
                }`}
              >
                Her gün
              </button>
              <button
                type="button"
                onClick={() => {
                  const initialDays = form.saleWeekdays && form.saleWeekdays.length > 0 ? form.saleWeekdays : [5];
                  set("saleWeekdays", initialDays);
                  set("availability", "dates");
                }}
                className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold border transition-colors min-h-[44px] ${
                  form.saleWeekdays && form.saleWeekdays.length > 0
                    ? "bg-amber-500 text-stone-950 border-amber-500"
                    : "bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700"
                }`}
              >
                Haftanın belirli günleri
              </button>
            </div>

            {form.saleWeekdays && form.saleWeekdays.length > 0 && (
              <div className="space-y-3 p-3.5 rounded-xl bg-stone-950 border border-stone-800">
                <div>
                  <span className="text-xs font-semibold text-stone-300 block mb-2">
                    Taze Pişme Günleri (Pzt…Paz)
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
                          onClick={() => {
                            const current = form.saleWeekdays ?? [];
                            const updated = selected ? current.filter((x) => x !== day.id) : [...current, day.id].sort();
                            if (updated.length > 0) {
                              set("saleWeekdays", updated);
                              set("availability", "dates");
                            } else {
                              set("saleWeekdays", null);
                              set("availability", "daily");
                            }
                          }}
                          className={`min-w-[44px] min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center ${
                            selected
                              ? "bg-amber-500 text-stone-950 border-amber-500 shadow-sm"
                              : "bg-stone-900 text-stone-300 border-stone-800 hover:border-stone-700"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Önizleme: Sonraki 3 Satış Günü */}
                {(() => {
                  const nextThree = upcomingSaleDates(form.saleWeekdays, istanbulToday(), 4).slice(0, 3);
                  return nextThree.length > 0 ? (
                    <div className="pt-2 border-t border-stone-900 flex items-center gap-2 flex-wrap text-xs text-stone-400">
                      <span className="font-semibold text-stone-300">Sıradaki Satış Günleri:</span>
                      {nextThree.map((d) => (
                        <span key={d} className="px-2 py-0.5 rounded-md bg-stone-900 border border-stone-800 text-amber-400 font-mono">
                          {formatTrDate(d)}
                        </span>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </Section>

          {/* Paket */}
          <Section title="Paket içeriği (isteğe bağlı)" icon={<Package className="w-4 h-4" />}>
            <div className="flex gap-2">
              <select value={bundlePick} onChange={(e) => setBundlePick(e.target.value)} className={inputCls}>
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
                className="px-4 rounded-xl bg-stone-800 text-stone-200 text-sm font-bold"
              >
                Ekle
              </button>
            </div>
            {form.bundleItems.length > 0 && (
              <div className="space-y-1.5">
                {form.bundleItems.map((b) => (
                  <div key={b.productId} className="flex items-center gap-2 text-sm text-stone-200">
                    <input
                      type="number"
                      min={1}
                      value={b.quantity}
                      onChange={(e) =>
                        set(
                          "bundleItems",
                          form.bundleItems.map((x) => (x.productId === b.productId ? { ...x, quantity: Math.max(1, Number(e.target.value)) } : x))
                        )
                      }
                      className={`${inputCls} w-20`}
                    />
                    <span className="flex-1">× {nameOf(b.productId)}</span>
                    <button type="button" aria-label="Kaldır" onClick={() => set("bundleItems", form.bundleItems.filter((x) => x.productId !== b.productId))} className="text-stone-500 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-stone-400">
                  Ayrı ayrı toplam: <strong className="text-stone-200">{tl(bundleSeparateTotal)}</strong>
                  {form.price > 0 && bundleSeparateTotal > form.price && (
                    <> · müşteri kazancı {tl(bundleSeparateTotal - form.price)} (eski fiyat alanına {tl(bundleSeparateTotal)} yazabilirsiniz)</>
                  )}
                </p>
              </div>
            )}
          </Section>

          {/* Birlikte iyi gider */}
          <Section title="Birlikte iyi gider (sepette öneri, en fazla 6)" icon={<Tag className="w-4 h-4" />}>
            <div className="flex flex-wrap gap-1.5">
              {others.map((p) => {
                const on = form.crossSell.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      set("crossSell", on ? form.crossSell.filter((x) => x !== p.id) : form.crossSell.length < 6 ? [...form.crossSell, p.id] : form.crossSell)
                    }
                    className={`px-2.5 py-1.5 rounded-lg text-xs border ${
                      on ? "bg-amber-500/15 text-amber-200 border-amber-500/40" : "bg-stone-950 text-stone-400 border-stone-800"
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
          <button type="button" onClick={() => setShowDetails(!showDetails)} className="text-xs text-stone-400 flex items-center gap-1">
            <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`} /> Ürün sayfası detayları (içerik, un, hikâye)
          </button>
          {showDetails && (
            <Section title="Ürün sayfası detayları">
              <Field label="İçindekiler" hint="Virgülle ayırın">
                <input
                  value={form.ingredients.join(", ")}
                  onChange={(e) => set("ingredients", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  className={inputCls}
                />
              </Field>
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
                    className={inputCls}
                  />
                </Field>
              </div>
              {(
                [
                  ["flourHeritage", "Unun ve mayanın hikâyesi"],
                  ["technique", "Teknik"],
                  ["pairingStorage", "Nasıl tüketilir, saklanır"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <textarea
                    rows={2}
                    value={form.masterclass?.[key] ?? ""}
                    onChange={(e) => set("masterclass", { ...(form.masterclass ?? {}), [key]: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              ))}
            </Section>
          )}
        </div>

        <div className="p-4 border-t border-stone-800 flex items-center justify-between gap-2">
          {onArchive && form.isActive ? (
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm(`"${form.name}" arşivlensin mi? Vitrinden kalkar, geçmiş siparişler korunur.`)) return;
                setSaving(true);
                try {
                  await onArchive();
                } catch (error: unknown) {
                  setErr(getErrorMessage(error));
                  setSaving(false);
                }
              }}
              className="px-3 py-2.5 rounded-xl text-sm text-red-300 hover:bg-red-500/10 flex items-center gap-1.5"
            >
              <Archive className="w-4 h-4" /> Arşivle
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {err && <span className="text-xs text-red-300 max-w-[220px]">{err}</span>}
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
            </button>
          </div>
        </div>
      </form>
    </div>
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

  return (
    <div className="space-y-3">
      {err && (
        <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {err}
        </div>
      )}
      {categories.map((c) => {
        const d = drafts[c.id] ?? c;
        const count = products.filter((p) => p.category === c.id).length;
        const dirty = d.name !== c.name || d.displayOrder !== c.displayOrder || d.isVisible !== c.isVisible;
        return (
          <div key={c.id} className="p-3 rounded-2xl bg-stone-900/70 border border-stone-800 flex flex-wrap items-center gap-2">
            <input
              value={d.name}
              onChange={(e) => setDrafts({ ...drafts, [c.id]: { ...d, name: e.target.value } })}
              className={`${inputCls} flex-1 min-w-[160px]`}
            />
            <input
              type="number"
              min={0}
              value={d.displayOrder}
              onChange={(e) => setDrafts({ ...drafts, [c.id]: { ...d, displayOrder: Number(e.target.value) } })}
              className={`${inputCls} w-20`}
              aria-label="Sıra"
            />
            <button
              type="button"
              onClick={() => setDrafts({ ...drafts, [c.id]: { ...d, isVisible: !d.isVisible } })}
              className="p-2.5 rounded-xl bg-stone-800 text-stone-300"
              aria-label={d.isVisible ? "Gizle" : "Göster"}
              title={d.isVisible ? "Vitrinde görünüyor" : "Vitrinde gizli"}
            >
              {d.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-stone-500" />}
            </button>
            <span className="text-xs text-stone-500 w-16 text-center">{count} ürün</span>
            <button
              type="button"
              disabled={!dirty || busy === c.id}
              onClick={() => run(c.id, () => onSave(d))}
              className="px-3 py-2.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-bold disabled:opacity-30"
            >
              {busy === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kaydet"}
            </button>
            <button
              type="button"
              disabled={count > 0 || busy === c.id}
              onClick={() => window.confirm(`"${c.name}" silinsin mi?`) && run(c.id, () => onDelete(c.id))}
              className="p-2.5 rounded-xl text-stone-500 hover:text-red-400 disabled:opacity-30"
              aria-label="Sil"
              title={count > 0 ? "İçinde ürün olan kategori silinemez; gizleyebilirsiniz" : "Sil"}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}

      <div className="flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Yeni kategori adı (ör. Kampanyalar)" className={inputCls} />
        <button
          type="button"
          disabled={newName.trim().length < 2 || busy === "new"}
          onClick={() =>
            run("new", async () => {
              await onSave({ name: newName.trim(), displayOrder: categories.length + 1, isVisible: true });
              setNewName("");
            })
          }
          className="px-4 rounded-xl bg-amber-500 text-stone-950 text-sm font-bold flex items-center gap-1 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" /> Ekle
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── küçük parçalar ─────────────────────────── */

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
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
      <span className="text-xs font-semibold text-stone-300">{label}</span>
      {children}
      {hint && <span className="block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`py-2.5 px-3 rounded-xl text-sm font-semibold border text-left ${
        on ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : "bg-stone-950 text-stone-500 border-stone-800"
      }`}
    >
      {on ? "✓ " : "○ "}
      {label}
    </button>
  );
}
