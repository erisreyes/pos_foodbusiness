/**
 * Checkout business logic — single entry point for completing a sale.
 *
 * Online:  validate stock → insert transaction → decrement_stock RPC → update local cache
 * Offline: validate local stock → write outbox → decrement local cache (sync later)
 */
import { supabase } from '../../lib/supabase';
import type { CartItem, PaymentMethod } from '../types/pos';
import { posDb } from '../offline/db';
import type {
  CheckoutReceipt,
  OutboxSale,
  OutboxSalePayload,
  SaleHeaderPayload,
} from '../offline/types';
import { generateUuid } from '../lib/generateUuid';
import { updateLocalProductStock } from '../offline/productRepository';

export type CompleteSaleInput = {
  items: CartItem[];
  cashierId: string;
  branch?: string;
  paymentMethod: PaymentMethod;
  tenderedCents: number;
  totalCents: number;
  subtotal: number;
  total: number;
  isOnline: boolean;
};

function buildSalePayload(input: CompleteSaleInput, txnNumber: string): OutboxSalePayload {
  const { items, cashierId, branch, paymentMethod, tenderedCents, totalCents, subtotal, total } =
    input;

  let amountTendered: number | null = null;
  let changeAmount: number | null = null;

  if (paymentMethod === 'cash') {
    amountTendered = tenderedCents / 100;
    changeAmount = (tenderedCents - totalCents) / 100;
  } else if (paymentMethod === 'cashless') {
    amountTendered = total;
    changeAmount = 0;
  }

  const header: SaleHeaderPayload = {
    transaction_number: txnNumber,
    cashier_id: cashierId,
    member_id: null,
    branch: branch ?? null,
    subtotal,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: total,
    amount_tendered: amountTendered,
    change_amount: changeAmount,
    payment_method: paymentMethod,
    payment_status: 'completed',
    source: input.isOnline ? 'pos_online' : 'pos_offline',
  };

  const lineItems = items.map((item) => ({
    product_id: item.product.id,
    product_name: item.product.name,
    unit_price: item.product.price,
    cost_price: item.product.cost ?? 0,
    quantity: item.quantity,
    discount_amount: 0,
    subtotal: item.product.price * item.quantity,
  }));

  return { header, lineItems, cartSnapshot: items };
}

async function validateLocalStock(items: CartItem[]): Promise<void> {
  for (const item of items) {
    const row = await posDb.products.get(item.product.id);
    const available = row?.stock ?? item.product.stock;
    if (available < item.quantity) {
      throw new Error(
        `Insufficient stock for ${item.product.name}. Available: ${available}, requested: ${item.quantity}.`,
      );
    }
  }
}

async function validateServerStock(items: CartItem[]): Promise<void> {
  for (const item of items) {
    const { data, error } = await supabase
      .from('products')
      .select('stock, name')
      .eq('id', item.product.id)
      .maybeSingle();

    if (error || !data) {
      throw new Error(`Could not verify stock for ${item.product.name}.`);
    }

    if (data.stock < item.quantity) {
      throw new Error(
        `Insufficient stock for ${data.name}. Available: ${data.stock}, requested: ${item.quantity}.`,
      );
    }
  }
}

/** Offline path: queue sale in outbox and decrement local stock atomically. */
async function completeSaleOffline(
  input: CompleteSaleInput,
  clientSaleId: string,
  txnNumber: string,
): Promise<CheckoutReceipt> {
  await validateLocalStock(input.items);

  const payload = buildSalePayload(input, txnNumber);
  const change = payload.header.change_amount ?? 0;

  const outboxRecord: OutboxSale = {
    id: clientSaleId,
    status: 'pending',
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    lastError: null,
    remoteTransactionId: null,
  };

  await posDb.transaction('rw', posDb.products, posDb.outbox_sales, async () => {
    await posDb.outbox_sales.add(outboxRecord);
    for (const item of input.items) {
      const row = await posDb.products.get(item.product.id);
      const currentStock = row?.stock ?? item.product.stock;
      const newStock = currentStock - item.quantity;
      if (newStock < 0) {
        throw new Error(`Insufficient stock for ${item.product.name}.`);
      }
      if (row) {
        await posDb.products.put({
          ...row,
          stock: newStock,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  });

  return { txnNumber, change, clientSaleId, offline: true };
}

/** Online path: write to Supabase immediately, then mirror stock in local cache. */
async function completeSaleOnline(input: CompleteSaleInput): Promise<CheckoutReceipt> {
  await validateLocalStock(input.items);
  await validateServerStock(input.items);

  const txnNumber = `TXN-${Date.now()}`;
  const payload = buildSalePayload(input, txnNumber);
  const { header, lineItems } = payload;
  const change = header.change_amount ?? 0;

  const insertPayload: Record<string, unknown> = {
    transaction_number: header.transaction_number,
    cashier_id: header.cashier_id,
    member_id: header.member_id,
    branch: header.branch,
    subtotal: header.subtotal,
    discount_amount: header.discount_amount,
    tax_amount: header.tax_amount,
    total_amount: header.total_amount,
    amount_tendered: header.amount_tendered,
    change_amount: header.change_amount,
    payment_method: header.payment_method,
    payment_status: header.payment_status,
  };

  const { data: txn, error: txnErr } = await supabase
    .from('transactions')
    .insert(insertPayload)
    .select()
    .single();

  if (txnErr) throw new Error(txnErr.message || 'Unable to save transaction.');

  const lineItemsWithTxn = lineItems.map((item) => ({
    ...item,
    transaction_id: txn.id,
  }));

  const { error: itemsErr } = await supabase.from('transaction_items').insert(lineItemsWithTxn);

  if (itemsErr) {
    await supabase.from('transactions').delete().eq('id', txn.id);
    throw new Error(itemsErr.message || 'Unable to save transaction items.');
  }

  for (const item of input.items) {
    const { error: stockErr } = await supabase.rpc('decrement_stock', {
      p_product_id: item.product.id,
      p_quantity: item.quantity,
    });
    if (stockErr) {
      await supabase.from('transaction_items').delete().eq('transaction_id', txn.id);
      await supabase.from('transactions').delete().eq('id', txn.id);
      throw new Error(`Stock update failed: ${stockErr.message}`);
    }
  }

  for (const item of input.items) {
    const row = await posDb.products.get(item.product.id);
    if (row) {
      await updateLocalProductStock(item.product.id, row.stock - item.quantity);
    }
  }

  return { txnNumber, change, offline: false };
}

export async function completeSale(input: CompleteSaleInput): Promise<CheckoutReceipt> {
  if (input.items.length === 0) {
    throw new Error('Cart is empty.');
  }

  if (input.paymentMethod === 'cash' && input.tenderedCents < input.totalCents) {
    throw new Error('Amount tendered must be at least the total due.');
  }

  if (!input.isOnline) {
    const clientSaleId = generateUuid();
    const shortId = clientSaleId.slice(0, 8).toUpperCase();
    const txnNumber = `OFFLINE-${shortId}`;
    return completeSaleOffline(input, clientSaleId, txnNumber);
  }

  return completeSaleOnline(input);
}
