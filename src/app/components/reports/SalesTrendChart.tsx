import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { format, parseISO, isValid } from 'date-fns';
import {
  getReportPeriodRanges,
  getTodayYmdInReportZone,
  listYmdDays,
  naiveHourPart,
  naiveDatePart,
  type RangeKey,
} from '../../../lib/reportDateRange';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

type Point = { date: string; revenue: number };

interface SalesTrendChartProps {
  loading?: boolean;
  data?: any;
  range?: RangeKey;
  singleDate?: string;
  customStart?: string;
  customEnd?: string;
}

export default function SalesTrendChart({
  loading: externalLoading,
  data,
  range: propRange,
  singleDate: propSingleDate,
  customStart: propCustomStart,
  customEnd: propCustomEnd,
}: SalesTrendChartProps) {
  const [loading, setLoading] = useState<boolean>(!!externalLoading);
  const [points, setPoints] = useState<Point[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Use prop values if provided, otherwise use internal state
  const range: RangeKey = propRange || 'this_month';
  const todayYmd = getTodayYmdInReportZone();
  const singleDate = propSingleDate || todayYmd;
  const customStart = propCustomStart || todayYmd;
  const customEnd = propCustomEnd || todayYmd;

  // Clear stale buckets before paint so useMemo never formats hour labels as dates (throws RangeError).
  useLayoutEffect(() => {
    setPoints([]);
    setError(null);
    setLoading(true);
  }, [range, singleDate, customStart, customEnd]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { current } = getReportPeriodRanges(range, customStart, customEnd);
        let buckets: string[] = [];
        let bucketFor: (createdAt: string) => string;

        if (range === 'today' || range === 'yesterday') {
          buckets = Array.from({ length: 24 }).map((_, i) => String(i));
          bucketFor = (createdAt) => naiveHourPart(createdAt);
        } else if (range === 'this_month') {
          const startYmd = current.start.slice(0, 10);
          const endYmd = current.end.slice(0, 10);
          buckets = listYmdDays(startYmd, endYmd);
          bucketFor = (createdAt) => naiveDatePart(createdAt);
        } else {
          const startYmd = customStart;
          const endYmd = customEnd;
          const allDays = listYmdDays(startYmd, endYmd);
          buckets = allDays.slice(0, 90);
          bucketFor = (createdAt) => naiveDatePart(createdAt);
        }

        const { data, error } = await supabase
          .from('transactions')
          .select('created_at, total_amount')
          .gte('created_at', current.start)
          .lte('created_at', current.end)
          .order('created_at', { ascending: true });

        if (error) throw new Error(`Supabase query failed: ${error.message}`);

        const map: Record<string, number> = {};
        buckets.forEach((b) => (map[b] = 0));

        (data || []).forEach((t: { created_at: string; total_amount?: number; total?: number }) => {
          const key = bucketFor(t.created_at);
          const amt = Number(t.total_amount ?? t.total ?? 0);
          map[key] = (map[key] || 0) + amt;
        });

        const pts: Point[] = buckets.map((b) => ({ date: b, revenue: Number(map[b] || 0) }));
        if (!cancelled) setPoints(pts);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('Failed to load sales trend data:', errorMsg);
        if (!cancelled) {
          setError(errorMsg);
          setPoints([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [range, singleDate, customStart, customEnd]);

  const formatted = useMemo(() => {
    if (loading || points.length === 0) return [];

    if (range === 'today' || range === 'yesterday') {
      return points.map((p) => ({ ...p, label: `${String(p.date).padStart(2, '0')}:00` }));
    }

    return points.map((p) => {
      const d = parseISO(p.date);
      const label = isValid(d) ? format(d, 'MMM d') : p.date;
      return { ...p, label };
    });
  }, [points, range, loading]);

  const showLoading = loading || externalLoading;

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-700">Sales Trend</h3>
      </div>

      <div className="w-full h-52 bg-white rounded-lg flex items-center justify-center">
        {error ? (
          <div className="p-4 text-center text-red-600 bg-red-50 rounded-lg w-full">
            <p className="font-semibold">Error loading chart</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : showLoading ? (
          <div className="text-gray-500">Loading chart...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formatted} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E8C5A" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#1E8C5A" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F7F4" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `₱${Number(v).toFixed(0)}`} />
              <Tooltip formatter={(v: number) => `₱${v.toFixed(2)}`} labelFormatter={(l: any) => l} />
              <Area type="monotone" dataKey="revenue" stroke="#1E8C5A" fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
