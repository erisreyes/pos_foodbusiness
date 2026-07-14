import React from 'react';

export default function TopProducts({ items, loading }: { items: any[]; loading?: boolean }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-700 mb-3">Top Selling Products</h3>
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-gray-500">No product sales data</div>
      ) : (
        <ul className="space-y-2">
          {items.map((p: any) => (
            <li key={p.id} className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-gray-500">₱{Number(p.revenue || 0).toFixed(2)} • {p.quantity || 0} sold</div>
              </div>
              <div className="w-32 h-3 bg-gray-100 rounded-full ml-4">
                <div className="h-3 bg-[#1E8C5A] rounded-full" style={{ width: `${Math.min(100, (p.revenue_percent || 0))}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
