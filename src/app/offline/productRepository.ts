/**
 * Product catalog cache — bridges Supabase and IndexedDB.
 *
 * hydrateCatalogFromServer() replaces the local cache when online.
 * loadProductsForPos() is what PosPage calls on every load.
 */
import type { Product } from '../types/pos';
import { fetchCategories, fetchProducts } from '../services/productService';
import { applyProductOrder, loadProductOrder } from '../lib/productOrder';
import { META_KEYS, getMeta, posDb, setMeta } from './db';
import type { CachedCategory, CachedProduct } from './types';

function toCachedProduct(product: Product): CachedProduct {
  return {
    ...product,
    updatedAt: new Date().toISOString(),
  };
}

export async function hydrateCatalogFromServer(): Promise<Product[]> {
  const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);

  const now = new Date().toISOString();
  const cachedProducts = products.map((p) => ({ ...toCachedProduct(p), updatedAt: now }));
  const cachedCategories: CachedCategory[] = (categories ?? []).map(
    (c: { id: string; name?: string }) => ({
      id: String(c.id),
      name: String(c.name ?? c.id),
      updatedAt: now,
    }),
  );

  await posDb.transaction('rw', posDb.products, posDb.categories, posDb.meta, async () => {
    await posDb.products.clear();
    await posDb.categories.clear();
    if (cachedProducts.length > 0) {
      await posDb.products.bulkPut(cachedProducts);
    }
    if (cachedCategories.length > 0) {
      await posDb.categories.bulkPut(cachedCategories);
    }
    await setMeta(META_KEYS.lastCatalogSync, now);
    await setMeta(META_KEYS.schemaVersion, '1');
  });

  const order = loadProductOrder();
  return applyProductOrder(products, order);
}

export async function getCachedProducts(): Promise<Product[]> {
  const rows = await posDb.products.toArray();
  const order = loadProductOrder();
  return applyProductOrder(
    rows.map(({ updatedAt: _u, ...p }) => p),
    order,
  );
}

export async function hasCachedCatalog(): Promise<boolean> {
  const count = await posDb.products.count();
  return count > 0;
}

export async function getCachedProductById(id: string): Promise<Product | null> {
  const row = await posDb.products.get(id);
  if (!row) return null;
  const { updatedAt: _u, ...product } = row;
  return product;
}

export async function getCachedProductByBarcode(barcode: string): Promise<Product | null> {
  const trimmed = barcode.trim();
  if (!trimmed) return null;
  const row = await posDb.products.where('barcode').equals(trimmed).first();
  if (row) {
    const { updatedAt: _u, ...product } = row;
    return product;
  }
  return getCachedProductById(trimmed);
}

export async function updateLocalProductStock(
  productId: string,
  newStock: number,
): Promise<void> {
  const row = await posDb.products.get(productId);
  if (!row) return;
  await posDb.products.put({
    ...row,
    stock: Math.max(0, newStock),
    updatedAt: new Date().toISOString(),
  });
}

export async function getLastCatalogSync(): Promise<string | null> {
  return getMeta(META_KEYS.lastCatalogSync);
}

export type LoadProductsResult = {
  products: Product[];
  fromCache: boolean;
};

/**
 * Cache-first load: returns IndexedDB data immediately when offline or cache exists;
 * refreshes from Supabase when online.
 */
export async function loadProductsForPos(isOnline: boolean): Promise<LoadProductsResult> {
  const cached = await getCachedProducts();

  if (!isOnline) {
    if (cached.length === 0) {
      throw new Error('No offline catalog. Connect to the internet and sign in to download products.');
    }
    return { products: cached, fromCache: true };
  }

  try {
    const fresh = await hydrateCatalogFromServer();
    return { products: fresh, fromCache: false };
  } catch (err) {
    if (cached.length > 0) {
      console.warn('Failed to refresh catalog from server, using cache:', err);
      return { products: cached, fromCache: true };
    }
    throw err;
  }
}

export async function refreshProductFromCache(id: string): Promise<Product | null> {
  return getCachedProductById(id);
}
