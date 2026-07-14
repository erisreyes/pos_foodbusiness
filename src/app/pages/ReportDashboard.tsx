import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { Toaster } from '../components/ui/sonner';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import HeroMetrics from '../components/reports/HeroMetrics';
import SalesTrendChart from '../components/reports/SalesTrendChart';
import TopProducts from '../components/reports/TopProducts';
import PaymentDonut from '../components/reports/PaymentDonut';
import CategoryChart from '../components/reports/CategoryChart';
import BranchTable from '../components/reports/BranchTable';
import { useReportData } from '../hooks/useReportData';
import { getTodayYmdInReportZone, type RangeKey } from '../../lib/reportDateRange';
import { cn } from '../components/ui/utils';

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
];

export default function ReportDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [range, setRange] = useState<RangeKey>('today');
  const [customStart, setCustomStart] = useState<string>(() => getTodayYmdInReportZone());
  const [customEnd, setCustomEnd] = useState<string>(() => getTodayYmdInReportZone());

  const { data, loading } = useReportData(range, undefined, customStart, customEnd);

  const handleLogout = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Toaster richColors />

      <AppHeader onLogout={handleLogout} />

      <div className="px-4 pt-4 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] pb-4">
          <span className="text-2xl font-semibold text-gray-700 shrink-0">Sales Report</span>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap sm:justify-end">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Select date range">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRange(option.value)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    range === option.value
                      ? 'bg-[#15803d] text-white shadow-sm'
                      : 'border border-[#D1D5DB] bg-white text-gray-700 hover:border-[#15803d]/40 hover:bg-[#F9FAFB]',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

          {range === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="report-custom-start">
                Start date
              </label>
              <input
                id="report-custom-start"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20"
              />
              <span className="text-sm text-gray-500" aria-hidden>
                to
              </span>
              <label className="sr-only" htmlFor="report-custom-end">
                End date
              </label>
              <input
                id="report-custom-end"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20"
              />
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-4 py-4 max-w-7xl mx-auto">
        <HeroMetrics loading={loading} data={data} />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[620px_1fr] gap-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <SalesTrendChart loading={loading} data={data} range={range} customStart={customStart} customEnd={customEnd} />
          </div>

          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <TopProducts items={data?.topProducts ?? []} loading={loading} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <PaymentDonut data={data} loading={loading} />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <CategoryChart data={data} loading={loading} />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm lg:col-span-1">
            <BranchTable rows={data?.branches ?? []} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}
