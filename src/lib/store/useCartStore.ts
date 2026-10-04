import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Product, ProductionBatch, Order } from "@/types";
import { isIsoDate } from "@/lib/time/istanbul";

export interface CartItem {
  productId: string;
  batchId?: string;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
  imageUrl: string;
  weight: number;
  flourTypes?: string[];
  hydration?: number;
}

export type DeliveryMethod = "courier";

export interface CustomerInfo {
  name: string;
  phone: string;
  /** Mahalle adı ("Mah." eki olmadan), ayarlardaki listeden */
  neighborhood: string;
  addressDetail: string;
  /** `YYYY-MM-DD` (İstanbul) — `/api/availability` listesinden; boş = seçilmedi */
  deliveryDate: string;
  note?: string;
  /** Müşteri "Konumumu ekle" ile paylaştıysa (kuryenin kapıyı bulması için) */
  customerLat?: number | null;
  customerLng?: number | null;
  locationConsentAt?: string | null;
}

export interface CompletedOrder {
  order: Order;
  /** Takip linki için imzalı token (misafir siparişinde tam görünüm) */
  trackingToken: string | null;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  deliveryMethod: DeliveryMethod;
  customerInfo: CustomerInfo;
  isSuccessModalOpen: boolean;
  lastCompleted: CompletedOrder | null;

  addItem: (product: Product, batch?: ProductionBatch | null, quantity?: number) => boolean;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setCustomerInfo: (info: Partial<CustomerInfo>) => void;
  setLocation: (lat: number | null, lng: number | null) => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  showSuccess: (completed: CompletedOrder) => void;
  hideSuccess: () => void;

  getItemCount: () => number;
  getSubtotal: () => number;
}

// Drawer'ı sadece masaüstünde otomatik aç; mobilde alttaki sepet barı kullanılır
const shouldAutoOpenCart = () =>
  typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;

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
      isSuccessModalOpen: false,
      lastCompleted: null,

      addItem: (product, batch, quantity = 1) => {
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex((item) => item.productId === product.id);
        const maxStock = batch?.availableStock ?? 100;

        if (existingIndex > -1) {
          const updatedItems = [...currentItems];
          updatedItems[existingIndex] = {
            ...currentItems[existingIndex],
            quantity: Math.min(100, currentItems[existingIndex].quantity + quantity),
            maxStock,
          };
          set({ items: updatedItems, isOpen: get().isOpen || shouldAutoOpenCart() });
          return true;
        }

        const newItem: CartItem = {
          productId: product.id,
          batchId: batch?.batchId,
          name: product.name,
          price: product.price,
          quantity,
          maxStock,
          imageUrl: product.imageUrl,
          weight: product.weight,
          flourTypes: product.flourTypes,
          hydration: product.hydration,
        };
        set({ items: [...currentItems, newItem], isOpen: get().isOpen || shouldAutoOpenCart() });
        return true;
      },

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

      clearCart: () => set({ items: [] }),

      setCustomerInfo: (info) => set({ customerInfo: { ...get().customerInfo, ...info } }),

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
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      showSuccess: (completed) => set({ isSuccessModalOpen: true, lastCompleted: completed }),
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
