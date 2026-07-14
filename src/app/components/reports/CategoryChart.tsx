import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { ReportData } from '../../hooks/useReportData';

const BAR_COLORS = ['#1E8C5A', '#2A9D63', '#3BB06E', '#4CC379', '#5DD684', '#6EE98F', '#7FFCA8', '#90FFB1'];

function formatCurrency(value: number) {
  return `₱${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function truncateLabel(name: string, max = 14) {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

export default function CategoryChart({
  data,
  loading,
}: {
  data?: ReportData | null;
  loading?: boolean;
}) {
  const chartData = useMemo(() => {
    const cats = data?.categories ?? [];
    return [...cats]
      .map((c) => ({ name: String(c.name), revenue: Number(c.revenue || 0) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [data?.categories]);

  const maxRevenue = useMemo(
    () => chartData.reduce((max, row) => Math.max(max, row.revenue), 0),
    [chartData],
  );

  return (
    <div>
      <h4 className="font-semibold text-gray-700 mb-3">Category Performance</h4>

      <div className="w-full h-52">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">Loading chart…</div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm bg-gray-50 rounded-lg">
            No category sales in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F7F4" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, maxRevenue > 0 ? Math.ceil(maxRevenue * 1.1) : 'auto']}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickFormatter={(v) => formatCurrency(Number(v))}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={88}
                tick={{ fontSize: 11, fill: '#374151' }}
                tickFormatter={(v) => truncateLabel(String(v))}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(30, 140, 90, 0.08)' }}
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                labelFormatter={(label) => label}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
