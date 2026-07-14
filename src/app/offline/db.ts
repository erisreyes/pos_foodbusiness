/**
 * IndexedDB layer (Dexie) for offline catalog and sale outbox.
 *
 * This is the browser's local database — survives page reloads and works without network.
 * Supabase remains the source of truth; IndexedDB is a cache + queue.
 */
import Dexie, { type Table } from 'dexie';
import { generateUuid } from '../lib/generateUuid';
import type { CachedCategory, CachedProduct, MetaRecord, OutboxSale } from './types';

export class PosOfflineDatabase extends Dexie {
  products!: Table<CachedProduct, string>;
  categories!: Table<CachedCategory, string>;
  meta!: Table<MetaRecord, string>;
  outbox_sales!: Table<OutboxSale, string>;

  constructor() {
    super('MiniStepPosOffline');

    this.version(1).stores({
      products: 'id, name, category, barcode, updatedAt',
      categories: 'id, name, updatedAt',
      meta: 'key',
      outbox_sales: 'id, status, createdAt',
    });
  }
}

export const posDb = new PosOfflineDatabase();

export const META_KEYS = {
  lastCatalogSync: 'lastCatalogSync',
  deviceId: 'deviceId',
  schemaVersion: 'schemaVersion',
} as const;

export async function getMeta(key: string): Promise<string | null> {
  const row = await posDb.meta.get(key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await posDb.meta.put({ key, value });
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getMeta(META_KEYS.deviceId);
  if (existing) return existing;
  const id = generateUuid();
  await setMeta(META_KEYS.deviceId, id);
  return id;
}

export async function countPendingOutbox(): Promise<number> {
  return posDb.outbox_sales.where('status').equals('pending').count();
}

export async function countFailedOutbox(): Promise<number> {
  return posDb.outbox_sales.where('status').equals('failed').count();
}
