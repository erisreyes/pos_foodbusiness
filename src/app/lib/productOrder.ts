import type { Product } from '../types/pos';

export const POS_PRODUCT_ORDER_KEY = 'pos-product-order';

export function loadProductOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(POS_PRODUCT_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : null;
  } catch {
    return null;
  }
}

export function saveProductOrder(productIds: string[]): void {
  localStorage.setItem(POS_PRODUCT_ORDER_KEY, JSON.stringify(productIds));
}

/** Apply saved ID order; unknown products append at end in stable name order. */
export function applyProductOrder(products: Product[], order: string[] | null): Product[] {
  if (!order?.length) return products;

  const indexMap = new Map(order.map((id, index) => [id, index]));
  return [...products].sort((a, b) => {
    const ai = indexMap.get(a.id);
    const bi = indexMap.get(b.id);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

/**
 * Merge a reordered visible subset back into the full product list order.
 */
export function mergeVisibleReorder(
  allProducts: Product[],
  reorderedVisible: Product[],
): Product[] {
  const visibleIds = reorderedVisible.map((p) => p.id);
  const visibleSet = new Set(visibleIds);
  const allIds = allProducts.map((p) => p.id);

  const firstVisibleIndex = allIds.findIndex((id) => visibleSet.has(id));
  if (firstVisibleIndex === -1) return reorderedVisible;

  const before = allIds.slice(0, firstVisibleIndex).filter((id) => !visibleSet.has(id));
  const after = allIds.slice(firstVisibleIndex).filter((id) => !visibleSet.has(id));
  const mergedIds = [...before, ...visibleIds, ...after];

  const byId = new Map(allProducts.map((p) => [p.id, p]));
  return mergedIds.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
}
