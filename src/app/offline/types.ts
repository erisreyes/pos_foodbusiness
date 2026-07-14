/** Types for IndexedDB records and the offline sale outbox payload shape. */
import type { CartItem, PaymentMethod, Product } from '../types/pos';

/** Outbox row lifecycle: pending → syncing → synced (or failed on error) */
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export type CachedProduct = Product & {
  updatedAt: string;
};

export type CachedCategory = {
  id: string;
  name: string;
  updatedAt: string;
};

export type MetaRecord = {
  key: string;
  value: string;
};

export type SaleLineItemPayload = {
  product_id: string;
  product_name: string;
  unit_price: number;
  cost_price: number;
  quantity: number;
  discount_amount: number;
  subtotal: number;
};

export type SaleHeaderPayload = {
  transaction_number: string;
  cashier_id: string;
  member_id: null;
  branch: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  amount_tendered: number | null;
  change_amount: number | null;
  payment_method: PaymentMethod;
  payment_status: 'completed';
  source: 'pos_online' | 'pos_offline';
};

export type OutboxSalePayload = {
  header: SaleHeaderPayload;
  lineItems: SaleLineItemPayload[];
  cartSnapshot: CartItem[];
};

export type OutboxSale = {
  id: string;
  status: SyncStatus;
  payload: OutboxSalePayload;
  createdAt: string;
  retryCount: number;
  lastError: string | null;
  remoteTransactionId: string | null;
};

export type CheckoutReceipt = {
  txnNumber: string;
  change: number;
  clientSaleId?: string;
  offline?: boolean;
};
