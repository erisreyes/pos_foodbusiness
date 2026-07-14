/** Core domain types shared across POS UI, services, and offline cache. */

export interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  cost: number;
  category: string;
  category_id?: string;
  image?: string;
  stock: number;
  minStockLevel?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'cashless' | 'card' | 'mobile';
  timestamp: Date;
  status: 'completed' | 'refunded';
}

export type PaymentMethod = 'cash' | 'cashless' | 'card' | 'mobile';
