"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Layers,
  Search,
  Plus,
  Edit3,
  Check,
  X,
  Sparkles,
  Wheat,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Filter,
  Flame,
  Clock,
  Droplet,
} from "lucide-react";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { INITIAL_PRODUCTS, ExtendedProduct, normalizeCategory } from "@/hooks/useProducts";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Edit/Add modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<ExtendedProduct> | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);

  // Load products from Firestore or fallback
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "urunler"));
      if (!snap.empty) {
        const list: ExtendedProduct[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ExtendedProduct);
        });
        setProducts(list);
      } else {
        // Fallback to initial catalogue
        setProducts(INITIAL_PRODUCTS);
      }
    } catch (err) {
      console.warn("Firestore urunler fetch failed, using defaults:", err);
      setProducts(INITIAL_PRODUCTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Quick inline price update
  const handlePriceChange = async (id: string, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) return;
    setSavingId(id);
    try {
      const productRef = doc(db, "urunler", id);
      await updateDoc(productRef, { price: newPrice });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, price: newPrice } : p))
      );
    } catch {
      // If doc doesn't exist yet, seed it
      const current = products.find((p) => p.id === id);
      if (current) {
        await setDoc(doc(db, "urunler", id), { ...current, price: newPrice });
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, price: newPrice } : p))
        );
      }
    } finally {
      setTimeout(() => setSavingId(null), 400);
    }
  };

  // Quick inline stock toggle
  const handleStockToggle = async (id: string, currentStatus?: boolean) => {
    const nextStatus = currentStatus === false ? true : false;
    setSavingId(id);
    try {
      const productRef = doc(db, "urunler", id);
      await updateDoc(productRef, { isAvailable: nextStatus });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isAvailable: nextStatus } : p))
      );
    } catch {
      const current = products.find((p) => p.id === id);
      if (current) {
        await setDoc(doc(db, "urunler", id), { ...current, isAvailable: nextStatus });
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isAvailable: nextStatus } : p))
        );
      }
    } finally {
      setTimeout(() => setSavingId(null), 400);
    }
  };

  // Open Edit Modal
  const openEditModal = (product: ExtendedProduct) => {
    setIsNewProduct(false);
    setEditingProduct({ ...product });
    setModalOpen(true);
  };

  // Open New Product Modal
  const openNewModal = () => {
    setIsNewProduct(true);
    const newId = `ekmek-${Date.now().toString(36)}`;
    setEditingProduct({
      id: newId,
      name: "",
      description: "",
      price: 150,
      category: "bread",
      stock: 50,
      weight: 800,
      weightUnit: "g",
      imageUrl: "/images/bread-hero.jpg",
      isAvailable: true,
      isActive: true,
      masterclass: {
        flourHeritage: "",
        technique: "",
        healthBenefit: "",
        pairingStorage: "",
      },
    });
    setModalOpen(true);
  };

  // Save Modal
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name) return;

    const prodId = editingProduct.id || `ekmek-${Date.now().toString(36)}`;
    const finalProduct = {
      ...editingProduct,
      id: prodId,
      price: Number(editingProduct.price) || 0,
      weight: Number(editingProduct.weight) || 0,
      stock: Number(editingProduct.stock) || 0,
    } as ExtendedProduct;

    try {
      await setDoc(doc(db, "urunler", prodId), finalProduct, { merge: true });
      if (isNewProduct) {
        setProducts((prev) => [finalProduct, ...prev]);
      } else {
        setProducts((prev) => prev.map((p) => (p.id === prodId ? finalProduct : p)));
      }
      setModalOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      alert("Ürün kaydedilirken hata oluştu: " + err.message);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== "all") {
        const norm = normalizeCategory(p.category);
        if (selectedCategory === "bread" && norm !== "bread") return false;
        if (selectedCategory === "gurme" && norm !== "gurme") return false;
        if (selectedCategory === "specialty" && norm !== "specialty") return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }

      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900/80 p-6 rounded-2xl border border-stone-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-widest mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Katalog ve Fiyat Yönetimi</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-100 font-serif">
            Ürünler & Gurme Lezzetler
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            Taş fırın ekmekleri, mandıra & gurme ürünleri için anında fiyat, stok ve fermantasyon DNA düzenlemesi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProducts}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors border border-stone-700"
            title="Kataloğu Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
          </button>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Ürün Ekle</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-stone-900/60 border border-stone-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Ürün adı veya açıklama ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800/80 text-stone-400 hover:text-stone-200"
            }`}
          >
            Tüm Ürünler ({products.length})
          </button>
          <button
            onClick={() => setSelectedCategory("bread")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === "bread"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800/80 text-stone-400 hover:text-stone-200"
            }`}
          >
            🥖 Taş Fırın Ekmekleri
          </button>
          <button
            onClick={() => setSelectedCategory("gurme")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === "gurme"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800/80 text-stone-400 hover:text-stone-200"
            }`}
          >
            🧀 Gurme & Mandıra
          </button>
          <button
            onClick={() => setSelectedCategory("specialty")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === "specialty"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800/80 text-stone-400 hover:text-stone-200"
            }`}
          >
            ✨ Özel Seçkiler
          </button>
        </div>
      </div>

      {/* Product Table / Cards */}
      {loading ? (
        <div className="p-16 text-center text-stone-400 bg-stone-900 border border-stone-800 rounded-2xl">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
          Ürün kataloğu yükleniyor...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-16 text-center text-stone-400 bg-stone-900 border border-stone-800 rounded-2xl">
          Arama kriterlerinize uygun ürün bulunamadı.
        </div>
      ) : (
        <div className="bg-stone-900/70 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-800 text-[11px] font-semibold text-stone-400 uppercase tracking-wider bg-stone-950/40">
                  <th className="py-3.5 px-4">Görsel & Ürün</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Fiyat (₺)</th>
                  <th className="py-3.5 px-4">Gramaj</th>
                  <th className="py-3.5 px-4">Stok Durumu</th>
                  <th className="py-3.5 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/70 text-sm">
                {filteredProducts.map((prod) => {
                  const isAvailable = prod.isAvailable !== false;
                  const isSaving = savingId === prod.id;
                  const normCat = normalizeCategory(prod.category);

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-stone-800/30 transition-colors group"
                    >
                      {/* Visual & Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-stone-800 border border-stone-700 shrink-0">
                            {prod.imageUrl ? (
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-600">
                                <Wheat className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-stone-100 flex items-center gap-2">
                              <span>{prod.name}</span>
                              {prod.madeToOrder && (
                                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium">
                                  Siparişe Özel
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-stone-400 line-clamp-1 max-w-sm mt-0.5">
                              {prod.description}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        {normCat === "bread" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Ekmek
                          </span>
                        )}
                        {normCat === "gurme" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Gurme Lezzet
                          </span>
                        )}
                        {normCat === "specialty" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Özel Seçki
                          </span>
                        )}
                      </td>

                      {/* Inline Price */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            defaultValue={prod.price}
                            onBlur={(e) => handlePriceChange(prod.id, Number(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handlePriceChange(prod.id, Number((e.target as HTMLInputElement).value));
                              }
                            }}
                            className="w-20 bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-sm font-bold text-stone-100 focus:border-amber-500 focus:outline-none"
                          />
                          <span className="text-stone-400 text-xs font-bold">₺</span>
                          {isSaving && (
                            <Check className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                          )}
                        </div>
                      </td>

                      {/* Weight */}
                      <td className="py-3.5 px-4 text-xs text-stone-300 font-mono">
                        {prod.weight ? `${prod.weight} ${prod.weightUnit || "g"}` : "—"}
                      </td>

                      {/* In-Stock Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleStockToggle(prod.id, prod.isAvailable)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                            isAvailable
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAvailable ? "bg-emerald-400" : "bg-red-400"
                            }`}
                          />
                          <span>{isAvailable ? "Stokta Var" : "Tükendi"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openEditModal(prod)}
                          className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
                          title="Düzenle & Fermantasyon DNA"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Edit / Add Modal */}
      {modalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
              <div className="flex items-center gap-2">
                <Wheat className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-stone-100 font-serif text-lg">
                  {isNewProduct ? "Yeni Ürün Ekle" : "Ürün & Fermantasyon Detayları"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300">Ürün Adı</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    placeholder="Örn: Taş Fırın Ekşi Mayalı Köy Ekmeği"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300">Açıklama</label>
                  <textarea
                    rows={2}
                    value={editingProduct.description || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    placeholder="Ürünün tadı, dokusu ve içeriği hakkında kısa bilgi..."
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300">Fiyat (₺)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingProduct.price ?? 150}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300">Kategori</label>
                  <select
                    value={editingProduct.category || "bread"}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="bread">Taş Fırın Ekmeği</option>
                    <option value="gurme">Gurme Lezzet & Mandıra</option>
                    <option value="specialty">Özel Seçki & Atölye</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300">Gramaj (g)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingProduct.weight ?? 800}
                    onChange={(e) => setEditingProduct({ ...editingProduct, weight: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300">Stok Adedi</label>
                  <input
                    type="number"
                    min={0}
                    value={editingProduct.stock ?? 50}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300">Görsel URL</label>
                  <input
                    type="text"
                    value={editingProduct.imageUrl || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Masterclass / Fermentation DNA Section */}
              <div className="pt-4 border-t border-stone-800 space-y-4">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Fermantasyon DNA & Ustalık Notları (Vitrin Detayları)</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-stone-300">Un ve Mayanın Kökeni (flourHeritage)</label>
                    <input
                      type="text"
                      value={editingProduct.masterclass?.flourHeritage || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          masterclass: {
                            ...editingProduct.masterclass,
                            flourHeritage: e.target.value,
                          },
                        })
                      }
                      placeholder="Örn: Taş değirmen atalık Karakılçık ve Sarı Buğday unları..."
                      className="w-full mt-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-stone-300">Teknik & Fermantasyon (technique)</label>
                    <input
                      type="text"
                      value={editingProduct.masterclass?.technique || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          masterclass: {
                            ...editingProduct.masterclass,
                            technique: e.target.value,
                          },
                        })
                      }
                      placeholder="Örn: 36 saat soğuk fermantasyon, %78 hidrasyon oranı..."
                      className="w-full mt-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-stone-300">Beden & Sindirim Sağlığı (healthBenefit)</label>
                    <input
                      type="text"
                      value={editingProduct.masterclass?.healthBenefit || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          masterclass: {
                            ...editingProduct.masterclass,
                            healthBenefit: e.target.value,
                          },
                        })
                      }
                      placeholder="Örn: Düşük glisemik indeks, probiyotik mikrobiyom dostu sindirim..."
                      className="w-full mt-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{isNewProduct ? "Ürünü Ekle" : "Değişiklikleri Kaydet"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
