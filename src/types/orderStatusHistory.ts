import { AdminOrderStatus } from "./admin";

export type StatusChangedByRole = "system" | "admin" | "courier" | "customer";

export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  fromStatus: AdminOrderStatus | null;
  toStatus: AdminOrderStatus;
  changedByRole: StatusChangedByRole;
  changedById: string | null;
  note: string | null;
  createdAt: string;
}
