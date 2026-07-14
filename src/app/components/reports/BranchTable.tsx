import React from 'react';
import { CircleHelp } from 'lucide-react';
import type { BranchPerformanceRow } from '../../hooks/useReportData';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

function formatCurrency(value: number) {
  return `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getHelpMode(): 'tooltip' | 'popover' {
  if (typeof window === 'undefined') return 'tooltip';
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;
  return coarse || !canHover ? 'popover' : 'tooltip';
}

function subscribeHelpMode(cb: () => void) {
  const a = window.matchMedia('(pointer: coarse)');
  const b = window.matchMedia('(hover: hover)');
  a.addEventListener('change', cb);
  b.addEventListener('change', cb);
  return () => {
    a.removeEventListener('change', cb);
    b.removeEventListener('change', cb);
  };
}

function useBranchHelpMode(): 'tooltip' | 'popover' {
  return React.useSyncExternalStore(subscribeHelpMode, getHelpMode, () => 'tooltip');
}

const MODULE_HELP =
  'Totals match the rest of this dashboard for the selected period.';

function BranchHelpHint({ mode }: { mode: 'tooltip' | 'popover' }) {
  const btnClass =
    'inline-flex items-center justify-center min-h-8 min-w-8 rounded-full text-gray-400 hover:text-gray-600 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#15803d]/40';

  if (mode === 'popover') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={btnClass} aria-label="How branch metrics work">
            <CircleHelp className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="left"
          align="start"
          className="max-w-[min(320px,90vw)] text-xs leading-snug text-gray-700 border-gray-200"
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {MODULE_HELP}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className={btnClass} aria-label="How branch metrics work">
          <CircleHelp className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[280px] text-xs leading-snug">
        {MODULE_HELP}
      </TooltipContent>
    </Tooltip>
  );
}

export default function BranchTable({
  rows,
  loading,
}: {
  rows: BranchPerformanceRow[];
  loading?: boolean;
}) {
  const helpMode = useBranchHelpMode();

  return (
    <div>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-700">Branch performance</h4>
            <BranchHelpHint mode={helpMode} />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#E8EFED]">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-[#F4F8F3] border-b border-[#E8EFED]">
              <th
                scope="col"
                className="px-3 py-2.5 font-semibold text-[#1E3D2D]"
                title="Store or site label from the cashier profile"
              >
                Branch
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 font-semibold text-[#1E3D2D] text-right tabular-nums"
                title="Sum of transaction totals for this branch in the selected period"
              >
                Sales
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 font-semibold text-[#1E3D2D] text-right tabular-nums"
                title="Number of completed checkouts attributed to this branch"
              >
                Transactions
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 font-semibold text-[#1E3D2D] text-right tabular-nums"
                title="Sales divided by transactions for this branch"
              >
                Avg order
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                  Loading branch metrics…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                  No branch data in this period
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-[#F0F4F1] last:border-0 hover:bg-[#FAFCFA]">
                  <td className="px-3 py-2.5 font-medium text-gray-800 max-w-[140px] truncate" title={row.name}>
                    {row.name}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#15803d] font-semibold">
                    {formatCurrency(row.sales)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-800">{row.transactions}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                    {formatCurrency(row.avg)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
