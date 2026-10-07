import type { OrderItem, ExtendedProduct } from "@/types";

export interface ProgressStep {
  key: "bekliyor" | "hazirlaniyor" | "firinda" | "yolda" | "teslim";
  label: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface OrderProgression {
  currentStepIndex: number;
  steps: ProgressStep[];
  isCancelled: boolean;
  isDelivered: boolean;
  statusLabel: string;
}

const STEP_KEYS: ProgressStep["key"][] = [
  "bekliyor",
  "hazirlaniyor",
  "firinda",
  "yolda",
  "teslim",
];

const STEP_LABELS: Record<ProgressStep["key"], string> = {
  bekliyor: "Bekliyor",
  hazirlaniyor: "Hazırlanıyor",
  firinda: "Fırında",
  yolda: "Yolda",
  teslim: "Teslim",
};

/**
 * Sipariş durumunu 5 adımlı ilerleme çubuğuna eşler (I-03).
 * Bekliyor (0) -> Hazırlanıyor (1) -> Fırında (2) -> Yolda (3) -> Teslim (4)
 */
export function getOrderProgress(status: string): OrderProgression {
  const norm = (status || "").toLowerCase().trim();

  if (norm === "iptal") {
    return {
      currentStepIndex: -1,
      steps: STEP_KEYS.map((key) => ({
        key,
        label: STEP_LABELS[key],
        isCompleted: false,
        isCurrent: false,
      })),
      isCancelled: true,
      isDelivered: false,
      statusLabel: "İptal Edildi",
    };
  }

  let activeIndex = 0;
  if (norm === "hazirlaniyor") {
    activeIndex = 1;
  } else if (norm === "firinda") {
    activeIndex = 2;
  } else if (norm === "kuryede" || norm === "yolda" || norm === "dagitimda") {
    activeIndex = 3;
  } else if (norm === "teslim_edildi" || norm === "teslim") {
    activeIndex = 4;
  } else {
    activeIndex = 0;
  }

  const steps: ProgressStep[] = STEP_KEYS.map((key, idx) => ({
    key,
    label: STEP_LABELS[key],
    isCompleted: idx < activeIndex || (idx === 4 && activeIndex === 4),
    isCurrent: idx === activeIndex,
  }));

  const isDelivered = activeIndex === 4;

  return {
    currentStepIndex: activeIndex,
    steps,
    isCancelled: false,
    isDelivered,
    statusLabel: STEP_LABELS[STEP_KEYS[activeIndex]] || "Bekliyor",
  };
}

export interface ReorderItemResult {
  product: ExtendedProduct;
  quantity: number;
}

export interface ReorderPlan {
  availableItems: ReorderItemResult[];
  unavailableItems: Array<{ productId: string; productName: string }>;
  totalAvailableCount: number;
}

/**
 * Geçmiş sipariş kalemlerini güncel sunucu katalog ürünlerine dönüştürür ("Tekrar sipariş ver", I-03).
 * Fiyat sunucudaki güncel katalogdan alınır.
 */
export function buildReorderItems(
  orderItems: OrderItem[],
  catalogProducts: ExtendedProduct[]
): ReorderPlan {
  const catalogMap = new Map<string, ExtendedProduct>(
    catalogProducts.map((p) => [p.id, p])
  );

  const availableItems: ReorderItemResult[] = [];
  const unavailableItems: Array<{ productId: string; productName: string }> = [];

  for (const item of orderItems) {
    const p = catalogMap.get(item.productId);
    if (p && p.isActive !== false && p.isAvailable !== false) {
      availableItems.push({
        product: p,
        quantity: Math.max(1, item.quantity),
      });
    } else {
      unavailableItems.push({
        productId: item.productId,
        productName: item.productName || p?.name || "Ürün",
      });
    }
  }

  return {
    availableItems,
    unavailableItems,
    totalAvailableCount: availableItems.reduce((acc, it) => acc + it.quantity, 0),
  };
}

/**
 * Sipariş geçmişi veya notlarından eşik nedeniyle kaydırılma uyarısını ayıklar (I-03 / I-05).
 */
export function extractPostponedNotice(
  history: Array<{ note?: string | null; changedByRole?: string }>
): string | null {
  if (!history || history.length === 0) return null;

  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    const note = entry?.note || "";
    if (note.includes("eşiğe ulaşmadığı için") || note.includes("kaydırıldı")) {
      return note;
    }
  }

  return null;
}
