import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product, ExtendedProduct, ProductionBatch } from "@/types";
import { isIsoDate } from "@/lib/time/istanbul";
import type { ApplyReorderResult, CartItem, CartNotice, CompletedOrder, CustomerInfo, DeliveryMethod, PendingReorder, ReorderMode, ReorderRequestItem } from "@/types/cart";
export type { ApplyReorderResult, CartItem, CompletedOrder, CustomerInfo, DeliveryMethod, ReorderRequestItem } from "@/types/cart";

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  deliveryMethod: DeliveryMethod;
  customerInfo: CustomerInfo;
  /** Yalnızca mevcut sekme oturumunda tutulur (localStorage'a yazılmaz); sipariş tamamlanınca sıfırlanır. */
  termsAccepted: boolean;
  isSuccessModalOpen: boolean;
  lastCompleted: CompletedOrder | null;
  pendingReorder: PendingReorder | null;
  notice: CartNotice | null;
  noticeSequence: number;

  addItem: (product: Product, batch?: ProductionBatch | null, quantity?: number) => boolean;
  applyReorder: (
    catalogProducts: ExtendedProduct[],
    requestedItems: ReorderRequestItem[]
  ) => ApplyReorderResult;
  confirmReorder: (mode: ReorderMode) => void;
  cancelReorder: () => void;
  dismissNotice: () => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setCustomerInfo: (info: Partial<CustomerInfo>) => void;
  setTermsAccepted: (accepted: boolean) => void;
  setLocation: (lat: number | null, lng: number | null) => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  showSuccess: (completed: CompletedOrder) => void;
  hideSuccess: () => void;

  getItemCount: () => number;
  getSubtotal: () => number;
}

const DEFAULT_CUSTOMER_INFO: CustomerInfo = {
  name: "",
  phone: "",
  neighborhood: "",
  addressDetail: "",
  deliveryDate: "",
  note: "",
  customerLat: null,
  customerLng: null,
  locationConsentAt: null,
};

const stripMah = (value: string) => value.replace(/\s+Mah(\.|allesi)?$/i, "").trim();

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      deliveryMethod: "courier",
      customerInfo: DEFAULT_CUSTOMER_INFO,
      termsAccepted: false,
      isSuccessModalOpen: false,
      lastCompleted: null,
      pendingReorder: null,
      notice: null,
      noticeSequence: 0,

      addItem: (product, batch, quantity = 1) => {
        if (!Number.isFinite(quantity) || quantity < 1 || product.isAvailable === false) return false;
        const amount = Math.min(100, Math.floor(quantity));
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex((item) => item.productId === product.id);
        const maxStock = batch?.availableStock ?? 100;

        if (existingIndex > -1) {
          const updatedItems = [...currentItems];
          updatedItems[existingIndex] = {
            ...currentItems[existingIndex],
            quantity: Math.min(100, currentItems[existingIndex].quantity + amount),
            maxStock,
            weightUnit: product.weightUnit,
          };
          const added = updatedItems[existingIndex].quantity - currentItems[existingIndex].quantity;
          if (added === 0) return false;
          const sequence = get().noticeSequence + 1;
          set({ items: updatedItems, noticeSequence: sequence, notice: { sequence, name: product.name, quantity: added } });
          return true;
        }

        const newItem: CartItem = {
          productId: product.id,
          batchId: batch?.batchId,
          name: product.name,
          price: product.price,
          quantity: amount,
          maxStock,
          imageUrl: product.imageUrl,
          weight: product.weight,
          weightUnit: product.weightUnit,
          flourTypes: product.flourTypes,
          hydration: product.hydration,
        };
        const sequence = get().noticeSequence + 1;
        set({ items: [...currentItems, newItem], noticeSequence: sequence, notice: { sequence, name: product.name, quantity: amount } });
        return true;
      },

      applyReorder: (catalogProducts, requestedItems) => {
        const catalogById = new Map<string, ExtendedProduct>(
          catalogProducts.map((p) => [p.id, p])
        );
        const unavailableNames: string[] = [];
        const merged = new Map<string, CartItem>();

        for (const req of requestedItems) {
          const trimmedId = req.productId?.trim() || "";
          let matched = trimmedId ? catalogById.get(trimmedId) : undefined;
          if (!matched && !trimmedId && req.name.trim()) {
            const targetName = req.name.trim().toLocaleLowerCase("tr-TR");
            matched = catalogProducts.find(
              (p) => p.name.trim().toLocaleLowerCase("tr-TR") === targetName
            );
          }

          if (matched && matched.isActive !== false && matched.isAvailable !== false) {
            const qty = Math.max(1, Math.floor(req.quantity) || 1);
            const prev = merged.get(matched.id);
            if (prev) {
              merged.set(matched.id, {
                ...prev,
                quantity: Math.min(100, prev.quantity + qty),
              });
            } else {
              merged.set(matched.id, {
                productId: matched.id,
                name: matched.name,
                price: matched.price,
                quantity: Math.min(100, qty),
                maxStock: 100,
                imageUrl: matched.imageUrl,
                weight: matched.weight,
                weightUnit: matched.weightUnit,
                flourTypes: matched.flourTypes,
                hydration: matched.hydration,
              });
            }
          } else {
            unavailableNames.push(req.name || matched?.name || "Ürün");
          }
        }

        const nextItems = Array.from(merged.values());
        if (nextItems.length === 0) {
          return { addedCount: 0, unavailableNames };
        }

        if (get().items.length > 0) {
          set({ pendingReorder: { items: nextItems, unavailableNames }, isOpen: true, notice: null });
          return { addedCount: 0, unavailableNames, needsConfirmation: true };
        }
        set({ items: nextItems, isOpen: true, termsAccepted: false, notice: null });
        return { addedCount: nextItems.length, unavailableNames };
      },

      confirmReorder: (mode) => {
        const pending = get().pendingReorder;
        if (!pending) return;
        const merged = new Map<string, CartItem>();
        if (mode === "append") {
          for (const item of get().items) merged.set(item.productId, item);
        }
        for (const item of pending.items) {
          const existing = merged.get(item.productId);
          merged.set(item.productId, { ...item, quantity: Math.min(100, item.quantity + (existing?.quantity ?? 0)) });
        }
        set({ items: [...merged.values()], pendingReorder: null, isOpen: true, termsAccepted: false });
      },
      cancelReorder: () => set({ pendingReorder: null }),
      dismissNotice: () => set({ notice: null }),

      removeItem: (productId) => {
        set({ items: get().items.filter((item) => item.productId !== productId) });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.productId === productId ? { ...item, quantity: Math.min(100, quantity) } : item
          ),
        });
      },

      clearCart: () => set({ items: [], pendingReorder: null, notice: null }),

      setCustomerInfo: (info) => set({ customerInfo: { ...get().customerInfo, ...info } }),

      setTermsAccepted: (accepted) => set({ termsAccepted: accepted }),

      setLocation: (lat, lng) => {
        const has = lat !== null && lng !== null;
        set({
          customerInfo: {
            ...get().customerInfo,
            customerLat: has ? lat : null,
            customerLng: has ? lng : null,
            locationConsentAt: has ? new Date().toISOString() : null,
          },
        });
      },

      toggleCart: () => set({ isOpen: !get().isOpen }),
      openCart: () => set({ isOpen: true, notice: null }),
      closeCart: () => set({ isOpen: false, pendingReorder: null }),

      showSuccess: (completed) => set({ isSuccessModalOpen: true, lastCompleted: completed, termsAccepted: false }),
      hideSuccess: () => set({ isSuccessModalOpen: false }),

      getItemCount: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
      getSubtotal: () => get().items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    }),
    {
      name: "ekmeklab-cart-storage",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        deliveryMethod: state.deliveryMethod,
        customerInfo: state.customerInfo,
      }),
      // v1: deliveryDate "today"/"tomorrow"/"custom:…", mahalle "X Mah.", konum alanları farklı
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as { items?: CartItem[]; deliveryMethod?: string; customerInfo?: unknown };
        if (version < 2) {
          const old: Record<string, unknown> =
            typeof state.customerInfo === "object" && state.customerInfo !== null
              ? (state.customerInfo as Record<string, unknown>)
              : {};
          const oldDate = typeof old.deliveryDate === "string" ? old.deliveryDate : "";
          const customDate = oldDate.startsWith("custom:") ? oldDate.slice(7) : oldDate;
          state.customerInfo = {
            ...DEFAULT_CUSTOMER_INFO,
            name: typeof old.name === "string" ? old.name : "",
            phone: typeof old.phone === "string" ? old.phone : "",
            neighborhood: typeof old.neighborhood === "string" ? stripMah(old.neighborhood) : "",
            addressDetail:
              typeof old.addressDetail === "string"
                ? old.addressDetail.replace(/\s*\[📍 GPS:[^\]]*\]/g, "").trim()
                : "",
            note: typeof old.note === "string" ? old.note : "",
            deliveryDate: isIsoDate(customDate) ? customDate : "",
          };
          state.deliveryMethod = "courier";
        }
        return state as unknown as CartStore;
      },
    }
  )
);
