export type PaymentMethodType = 'cash' | 'pos' | 'online_card' | 'transfer' | 'cari';
export type PaymentStatusType = 'pending' | 'completed' | 'failed' | 'refunded' | 'partial';
export type PaymentCollectedBy = 'courier' | 'admin' | 'system' | null;

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethodType;
  status: PaymentStatusType;
  paidAt: string | null;
  collectedBy: PaymentCollectedBy;
  courierId: string | null;
  transactionRef: string | null;
  cariTransactionId: string | null;
  note: string | null;
  createdAt: string;
  updatedAt?: string;
}
