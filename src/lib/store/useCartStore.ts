import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Product, ProductionBatch, Order } from "@/types";

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

export type DeliveryMethod = "courier" | "pickup";

export interface CustomerInfo {
  name: string;
  phone: string;
  district: string;
  neighborhood: string;
  addressDetail: string;
  deliveryDate: string; // "today" | "tomorrow" | "custom:YYYY-MM-DD"
  customDate?: string;
  note?: string;
  shareLocation?: boolean;
  customerLat?: number | null;
  customerLng?: number | null;
  locationConsentAt?: string | null;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  deliveryMethod: DeliveryMethod;
  customerInfo: CustomerInfo;
  userId: string | null;
  isSuccessModalOpen: boolean;
  lastCompletedOrder: Order | null;

  // Actions
  addItem: (product: Product, batch?: ProductionBatch | null, quantity?: number) => boolean;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setDeliveryMethod: (method: DeliveryMethod) => void;
  setCustomerInfo: (info: Partial<CustomerInfo>) => void;
  setUserId: (userId: string | null) => void;
  setShareLocation: (share: boolean, lat?: number | null, lng?: number | null) => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  setSuccessModal: (open: boolean, order?: Order | null) => void;

  // Getters
  getItemCount: () => number;
  getSubtotal: () => number;
  getShippingFee: () => number;
  getTotalAmount: () => number;
}

const DEFAULT_CUSTOMER_INFO: CustomerInfo = {
  name: "",
  phone: "",
  district: "Beylikdüzü",
  neighborhood: "Adnan Kahveci Mah.",
  addressDetail: "",
  deliveryDate: "today",
  note: "",
  shareLocation: false,
  customerLat: null,
  customerLng: null,
  locationConsentAt: null,
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      deliveryMethod: "courier",
      customerInfo: DEFAULT_CUSTOMER_INFO,
      userId: null,
      isSuccessModalOpen: false,
      lastCompletedOrder: null,

      addItem: (product, batch, quantity = 1) => {
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex((item) => item.productId === product.id);
        const maxStock = batch?.availableStock ?? product.stock ?? 25;

        if (existingIndex > -1) {
          const existingItem = currentItems[existingIndex];
          const newQuantity = existingItem.quantity + quantity;
          const updatedItems = [...currentItems];
          updatedItems[existingIndex] = {
            ...existingItem,
            quantity: newQuantity,
            maxStock,
          };
          set({ items: updatedItems, isOpen: true });
          return true;
        } else {
          const newItem: CartItem = {
            productId: product.id,
            batchId: batch?.batchId || "BATCH-TAZE-FIRIN",
            name: product.name,
            price: product.price,
            quantity,
            maxStock,
            imageUrl: product.imageUrl,
            weight: product.weight,
            flourTypes: product.flourTypes,
            hydration: product.hydration,
          };
          set({ items: [...currentItems, newItem], isOpen: true });
          return true;
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.productId !== productId),
        });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set({
          items: get().items.map((item) => {
            if (item.productId === productId) {
              return { ...item, quantity };
            }
            return item;
          }),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      setDeliveryMethod: (method) => {
        set({ deliveryMethod: method });
      },

      setCustomerInfo: (info) => {
        set({
          customerInfo: { ...get().customerInfo, ...info },
        });
      },

      setUserId: (userId) => {
        set({ userId });
      },

      setShareLocation: (share, lat = null, lng = null) => {
        set({
          customerInfo: {
            ...get().customerInfo,
            shareLocation: share,
            customerLat: lat,
            customerLng: lng,
            locationConsentAt: share ? new Date().toISOString() : null,
          },
        });
      },

      toggleCart: () => set({ isOpen: !get().isOpen }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      setSuccessModal: (open, order = null) => {
        set({
          isSuccessModalOpen: open,
          lastCompletedOrder: order ?? get().lastCompletedOrder,
        });
      },

      getItemCount: () => {
        return get().items.reduce((acc, item) => acc + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      },

      getShippingFee: () => {
        const subtotal = get().getSubtotal();
        // 1000 TL ve üzeri teslimat ücretsiz, aksi halde 150 TL
        if (subtotal === 0) return 0;
        return subtotal >= 1000 ? 0 : 150;
      },

      getTotalAmount: () => {
        return get().getSubtotal() + get().getShippingFee();
      },
    }),
    {
      name: "ekmeklab-cart-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        deliveryMethod: state.deliveryMethod,
        customerInfo: state.customerInfo,
      }),
    }
  )
);
