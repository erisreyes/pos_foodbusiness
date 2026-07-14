/**
 * Offline sale sync engine.
 *
 * Drains outbox_sales → Supabase transactions + transaction_items.
 * Uses client_sale_id for idempotency so retries never create duplicate sales.
 */
import { supabase } from '../../lib/supabase';
import { hydrateCatalogFromServer } from './productRepository';
import { countFailedOutbox, countPendingOutbox, posDb } from './db';
import type { OutboxSale } from './types';

/** Prevents overlapping sync runs when heartbeat and reconnect fire together. */
let syncInFlight: Promise<SyncResult> | null = null;

export type SyncResult = {
  synced: number;
  failed: number;
  skipped: number;
};

function isDuplicateClientSaleError(err: unknown): boolean {
  const message =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message?: string }).message ?? '')
      : '';
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: string }).code ?? '')
      : '';
  return code === '23505' || message.toLowerCase().includes('client_sale_id');
}

function isStockError(err: unknown): boolean {
  const message =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message?: string }).message ?? '')
      : '';
  return message.toLowerCase().includes('stock') || message.toLowerCase().includes('insufficient');
}

/** Push one outbox sale to Supabase; duplicate client_sale_id is treated as already synced. */
async function pushSingleSale(sale: OutboxSale): Promise<'synced' | 'failed'> {
  const { header, lineItems } = sale.payload;

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
    source: 'pos_offline',
    client_sale_id: sale.id,
  };

  const { data: txn, error: txnErr } = await supabase
    .from('transactions')
    .insert(insertPayload)
    .select()
    .single();

  if (txnErr) {
    if (isDuplicateClientSaleError(txnErr)) {
      await posDb.outbox_sales.update(sale.id, {
        status: 'synced',
        lastError: null,
      });
      return 'synced';
    }
    throw txnErr;
  }

  const lineItemsWithTxn = lineItems.map((item) => ({
    ...item,
    transaction_id: txn.id,
  }));

  const { error: itemsErr } = await supabase.from('transaction_items').insert(lineItemsWithTxn);

  if (itemsErr) throw itemsErr;

  for (const item of lineItems) {
    const { error: stockErr } = await supabase.rpc('decrement_stock', {
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    });
    if (stockErr) throw stockErr;
  }

  await posDb.outbox_sales.update(sale.id, {
    status: 'synced',
    remoteTransactionId: txn.id,
    lastError: null,
  });

  return 'synced';
}

async function runSync(): Promise<SyncResult> {
  const pending = await posDb.outbox_sales
    .where('status')
    .anyOf(['pending', 'failed'])
    .sortBy('createdAt');

  const result: SyncResult = { synced: 0, failed: 0, skipped: 0 };

  if (pending.length === 0) {
    return result;
  }

  for (const sale of pending) {
    await posDb.outbox_sales.update(sale.id, { status: 'syncing', lastError: null });

    try {
      const outcome = await pushSingleSale(sale);
      if (outcome === 'synced') result.synced += 1;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      const retryCount = (sale.retryCount ?? 0) + 1;

      await posDb.outbox_sales.update(sale.id, {
        status: 'failed',
        lastError: message,
        retryCount,
      });

      result.failed += 1;

      if (isStockError(err)) {
        console.error(`Stock conflict syncing sale ${sale.id}:`, err);
      }
    }
  }

  try {
    await hydrateCatalogFromServer();
  } catch (err) {
    console.warn('Post-sync catalog refresh failed:', err);
  }

  return result;
}

export async function syncOutboxSales(): Promise<SyncResult> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = runSync().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

export async function getOutboxCounts(): Promise<{ pending: number; failed: number }> {
  const [pending, failed] = await Promise.all([countPendingOutbox(), countFailedOutbox()]);
  return { pending, failed };
}

export async function getFailedSales(): Promise<OutboxSale[]> {
  return posDb.outbox_sales.where('status').equals('failed').sortBy('createdAt');
}

export function isSyncRunning(): boolean {
  return syncInFlight !== null;
}
