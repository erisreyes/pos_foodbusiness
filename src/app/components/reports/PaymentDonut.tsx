import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { ReportData } from '../../hooks/useReportData';

function formatMethod(method: string) {
  if (method === 'cashless') return 'Cashless (GCash / Maya)';
  if (method === 'cash') return 'Cash';
  if (method === 'unknown') return 'Other / unknown';
  return method.replace(/_/g, ' ');
}

function formatCurrency(value: number) {
  return `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const METHOD_COLORS: Record<string, string> = {
  cash: '#15803d',
  cashless: '#2563eb',
  unknown: '#64748B',
};

const FALLBACK_COLORS = ['#1E8C5A', '#0D9488', '#7C3AED', '#CA8A04', '#EA580C', '#0891B2'];

type ChartRow = {
  key: string;
  name: string;
  revenue: number;
  count: number;
  pct: number;
  value: number;
};

type TooltipPayload = {
  name: string;
  revenue: number;
  count: number;
  pct: number;
};

function PaymentTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TooltipPayload }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
      <div className="font-semibold text-gray-900">{p.name}</div>
      <div className="text-[#1E8C5A] font-medium tabular-nums">{formatCurrency(p.revenue)}</div>
      <div className="text-gray-500 text-xs mt-0.5">
        {p.count} sale{p.count === 1 ? '' : 's'} · {p.pct.toFixed(1)}% of total
      </div>
    </div>
  );
}

export default function PaymentDonut({
  data,
  loading,
}: {
  data?: ReportData | null;
  loading?: boolean;
}) {
  const totalSales = data?.totalSales ?? 0;

  const chartRows: ChartRow[] = useMemo(() => {
    const payments = data?.paymentBreakdown ?? [];
    return [...payments]
      .map((p) => {
        const revenue = Number(p.revenue) || 0;
        const pct = totalSales > 0 ? (revenue / totalSales) * 100 : Number(p.percentage) || 0;
        return {
          key: p.method,
          name: formatMethod(p.method),
          revenue,
          count: p.count,
          pct,
          value: revenue,
        };
      })
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data?.paymentBreakdown, totalSales]);

  const sliceColors = useMemo(
    () =>
      chartRows.map(
        (row, i) => METHOD_COLORS[row.key] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      ),
    [chartRows],
  );

  const hasRevenue = chartRows.some((r) => r.value > 0);

  return (
    <div>
      <h4 className="font-semibold text-gray-700 mb-3">Payment methods</h4>

      <div className="relative w-full h-52">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm bg-gray-50 rounded-lg">
            Loading chart…
          </div>
        ) : !hasRevenue ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm bg-gray-50 rounded-lg">
            No payment data in this period
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <Tooltip content={<PaymentTooltip />} wrapperStyle={{ zIndex: 20 }} />
                <Pie
                  data={chartRows}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="54%"
                  outerRadius="82%"
                  paddingAngle={2}
                  cornerRadius={4}
                  stroke="#fff"
                  strokeWidth={2}
                  isAnimationActive
                >
                  {chartRows.map((row, index) => (
                    <Cell key={row.key} fill={sliceColors[index]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
              style={{ marginTop: '-0.25rem' }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Total sales
              </span>
              <span className="text-base sm:text-lg font-bold tabular-nums text-[#15803d] leading-tight">
                {formatCurrency(totalSales)}
              </span>
            </div>
          </>
        )}
      </div>

      {!loading && hasRevenue && (
        <ul className="mt-4 space-y-2.5" aria-label="Payment method breakdown">
          {chartRows.map((row, i) => (
            <li key={row.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white shadow-sm"
                  style={{ backgroundColor: sliceColors[i] }}
                  aria-hidden
                />
                <span className="text-gray-700 truncate">{row.name}</span>
              </span>
              <span className="shrink-0 text-right tabular-nums">
                <span className="font-semibold text-[#1E3D2D]">{row.pct.toFixed(0)}%</span>
                <span className="text-gray-500 font-normal ml-2">{formatCurrency(row.revenue)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
