import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getReportPeriodRanges, type RangeKey } from '../../lib/reportDateRange';

export type { RangeKey };

export type BranchPerformanceRow = {
  id: string;
  name: string;
  sales: number;
  transactions: number;
  avg: number;
};

export type ReportData = {
  totalSales: number;
  previousTotalSales: number;
  salesChange: number | null;
  comparisonLabel: string;
  transactionCount: number;
  previousTransactionCount: number;
  transactionsChange: number | null;
  avgOrder: number;
  previousAvgOrder: number;
  avgOrderChange: number | null;
  cogs: number;
  previousCogs: number;
  cogsChange: number | null;
  grossProfit: number;
  previousGrossProfit: number;
  profitChange: number | null;
  grossMargin: number;
  netProfit: number;
  previousNetProfit: number;
  netProfitChange: number | null;
  netMargin: number;
  branches: BranchPerformanceRow[];
  topProducts: Array<{ id: string; name: string; quantity: number; revenue: number }>;
  paymentBreakdown: Array<{ method: string; count: number; revenue: number; percentage: number }>;
  categories: Array<{ name: string; revenue: number }>;
};

function txAmount(t: { total_amount?: number }) {
  return Number(t.total_amount ?? 0);
}

function sumSales(transactions: Array<{ total_amount?: number }>) {
  return transactions.reduce((sum, t) => sum + txAmount(t), 0);
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  return ((current - previous) / previous) * 100;
}

type TransactionItemRow = {
  transaction_id: string;
  product_id: string;
  quantity?: number;
  subtotal?: number;
  cost_price?: number;
  discount_amount?: number;
};

function lineCogs(item: TransactionItemRow) {
  return Number(item.cost_price ?? 0) * Number(item.quantity ?? 0);
}

function sumCogs(items: TransactionItemRow[]) {
  return items.reduce((sum, item) => sum + lineCogs(item), 0);
}

function lineGrossProfit(item: TransactionItemRow) {
  const subtotal = Number(item.subtotal ?? 0);
  const discount = Number(item.discount_amount ?? 0);
  return subtotal - lineCogs(item) - discount;
}

function sumGrossProfit(items: TransactionItemRow[]) {
  return items.reduce((sum, item) => sum + lineGrossProfit(item), 0);
}

async function fetchTransactionItems(txIds: string[]) {
  if (txIds.length === 0) return [];

  const { data, error } = await supabase
    .from('transaction_items')
    .select('transaction_id, product_id, quantity, subtotal, cost_price, discount_amount')
    .in('transaction_id', txIds);

  if (error) throw error;
  return (data ?? []) as TransactionItemRow[];
}

async function fetchTransactionsInRange({ start, end }: { start: string; end: string }) {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, total_amount, cashier_id, payment_method, created_at')
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Map cashier (profile) id → branch text from `profiles.branch`. Batched for large `.in()` lists. */
async function fetchProfileBranchesByCashierIds(
  cashierIds: string[],
): Promise<Record<string, string | null>> {
  const unique = [...new Set(cashierIds.map((id) => String(id ?? '').trim()).filter(Boolean))];
  const map: Record<string, string | null> = {};
  if (unique.length === 0) return map;

  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data, error } = await supabase.from('profiles').select('id, branch').in('id', chunk);
    if (error) {
      console.warn('profiles branch lookup failed:', error.message);
      continue;
    }
    for (const row of data ?? []) {
      const r = row as { id: string; branch: string | null };
      map[r.id] = r.branch ?? null;
    }
  }
  return map;
}

function branchDisplayLabel(raw: string | null | undefined): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  return s.length > 0 ? s : 'Unassigned';
}

export function useReportData(
  range: RangeKey = 'this_month',
  _singleDate?: string,
  customStart?: string,
  customEnd?: string,
) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const periods = getReportPeriodRanges(range, customStart, customEnd);

        const [currentTx, previousTx, productsRes] = await Promise.all([
          fetchTransactionsInRange(periods.current),
          fetchTransactionsInRange(periods.previous),
          supabase.from('products').select('*').order('name', { ascending: true }).order('id', { ascending: true }).limit(500),
        ]);

        const products = productsRes.data ?? [];

        const totalSales = sumSales(currentTx);
        const previousTotalSales = sumSales(previousTx);
        const transactionCount = currentTx.length;
        const previousTransactionCount = previousTx.length;
        const avgOrder = transactionCount ? totalSales / transactionCount : 0;
        const previousAvgOrder = previousTransactionCount
          ? previousTotalSales / previousTransactionCount
          : 0;

        const uniqueCashierIds = [
          ...new Set(
            currentTx
              .map((t: { cashier_id?: string | null }) => t.cashier_id)
              .filter((id): id is string => Boolean(id && String(id).trim())),
          ),
        ];
        let cashierIdToBranch: Record<string, string | null> = {};
        try {
          cashierIdToBranch = await fetchProfileBranchesByCashierIds(uniqueCashierIds);
        } catch (e) {
          console.warn('Branch profile lookup error', e);
        }

        const branchesMap: Record<string, BranchPerformanceRow> = {};
        currentTx.forEach((t: { cashier_id?: string | null; total_amount?: number }) => {
          const cid = t.cashier_id && String(t.cashier_id).trim() ? String(t.cashier_id) : '';
          const rawBranch = cid ? cashierIdToBranch[cid] : null;
          const label = branchDisplayLabel(rawBranch);
          if (!branchesMap[label]) {
            branchesMap[label] = { id: label, name: label, sales: 0, transactions: 0, avg: 0 };
          }
          branchesMap[label].sales += txAmount(t);
          branchesMap[label].transactions += 1;
        });
        const branches = Object.values(branchesMap)
          .map((b) => ({
            ...b,
            avg: b.transactions ? b.sales / b.transactions : 0,
          }))
          .sort((a, b) => b.sales - a.sales);

        const currentTxIds = currentTx.map((t: { id: string }) => t.id).filter(Boolean);
        const previousTxIds = previousTx.map((t: { id: string }) => t.id).filter(Boolean);
        const allTxIds = [...new Set([...currentTxIds, ...previousTxIds])];

        let cogs = 0;
        let previousCogs = 0;
        let grossProfit = 0;
        let previousGrossProfit = 0;
        let topProducts: ReportData['topProducts'] = [];

        if (allTxIds.length > 0) {
          try {
            const lineItems = await fetchTransactionItems(allTxIds);
            const currentIdSet = new Set(currentTxIds);
            const previousIdSet = new Set(previousTxIds);

            const currentItems = lineItems.filter((it) => currentIdSet.has(it.transaction_id));
            const previousItems = lineItems.filter((it) => previousIdSet.has(it.transaction_id));

            cogs = sumCogs(currentItems);
            previousCogs = sumCogs(previousItems);
            grossProfit = sumGrossProfit(currentItems);
            previousGrossProfit = sumGrossProfit(previousItems);

            const map: Record<string, { id: string; quantity: number; revenue: number }> = {};
            currentItems.forEach((it) => {
              const id = it.product_id;
              if (!map[id]) map[id] = { id, quantity: 0, revenue: 0 };
              map[id].quantity += Number(it.quantity || 0);
              map[id].revenue += Number(it.subtotal || 0);
            });
            topProducts = Object.values(map)
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 10)
              .map((p) => ({
                ...p,
                name: (products.find((x: { id: string; name?: string }) => x.id === p.id) || {}).name || p.id,
              }));
          } catch {
            // transaction_items may be unavailable
          }
        }

        const netProfit = totalSales - cogs;
        const previousNetProfit = previousTotalSales - previousCogs;
        const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
        const netMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
        const cogsChange = percentChange(cogs, previousCogs);
        const profitChange = percentChange(grossProfit, previousGrossProfit);
        const netProfitChange = percentChange(netProfit, previousNetProfit);

        const paymentCounts: Record<string, { method: string; count: number; revenue: number }> = {};
        currentTx.forEach((t: any) => {
          const m = t.payment_method || 'unknown';
          if (!paymentCounts[m]) paymentCounts[m] = { method: m, count: 0, revenue: 0 };
          paymentCounts[m].count += 1;
          paymentCounts[m].revenue += txAmount(t);
        });
        const paymentBreakdown = Object.values(paymentCounts).map((p) => ({
          method: p.method,
          count: p.count,
          revenue: p.revenue,
          percentage: totalSales ? Math.round((p.revenue / totalSales) * 100) : 0,
        }));

        const categoriesMap: Record<string, { name: string; revenue: number }> = {};
        topProducts.forEach((tp) => {
          const prod = products.find((x: any) => x.id === tp.id) || {};
          const cat = prod.category || prod.category_id || 'Uncategorized';
          if (!categoriesMap[cat]) categoriesMap[cat] = { name: cat, revenue: 0 };
          categoriesMap[cat].revenue += tp.revenue || 0;
        });
        const categories = Object.values(categoriesMap);

        if (!cancelled) {
          const salesChange = percentChange(totalSales, previousTotalSales);
          const transactionsChange = percentChange(transactionCount, previousTransactionCount);
          const avgOrderChange = percentChange(avgOrder, previousAvgOrder);
          setData({
            totalSales,
            previousTotalSales,
            salesChange,
            comparisonLabel: periods.comparisonLabel,
            transactionCount,
            previousTransactionCount,
            transactionsChange,
            avgOrder,
            previousAvgOrder,
            avgOrderChange,
            cogs,
            previousCogs,
            cogsChange,
            grossProfit,
            previousGrossProfit,
            profitChange,
            grossMargin,
            netProfit,
            previousNetProfit,
            netProfitChange,
            netMargin,
            branches,
            topProducts,
            paymentBreakdown,
            categories,
          });
        }
      } catch (err: any) {
        console.error('Report load failed', err);
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [range, customStart, customEnd]);

  return { data, loading, error } as const;
}
