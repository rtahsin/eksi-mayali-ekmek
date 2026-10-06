export type FunnelEvent =
  | "scan"
  | "cart_open"
  | "checkout_start"
  | "order_ok"
  | "order_error"
  | "learning_session";

export interface LearningSessionProps {
  durationSeconds: number;
  cardsViewed: number;
  path?: string;
  [key: string]: unknown;
}

export interface TrackExtra {
  code?: string;
  orderId?: string;
  once?: boolean;
  props?: Record<string, unknown>;
  env?: "production" | "preview" | "development";
}
