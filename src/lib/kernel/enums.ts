import type { Database } from "@/types/database";

export type Role = Database["public"]["Enums"]["user_role_type"];
export type OrderStatus = Database["public"]["Enums"]["order_status_type"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method_type"];

export const ROLES: readonly Role[] = [
  "customer",
  "staff",
  "admin",
  "superadmin",
  "courier",
] as const;

export const ORDER_STATUSES: readonly OrderStatus[] = [
  "bekliyor",
  "hazirlaniyor",
  "firinda",
  "kuryede",
  "teslim_edildi",
  "iptal",
] as const;

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  "cash_on_delivery",
  "pos_at_door",
  "whatsapp",
  "online",
  "transfer",
  "cari",
] as const;
