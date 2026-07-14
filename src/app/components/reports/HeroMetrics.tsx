import React from 'react';
import { CircleHelp } from 'lucide-react';
import type { ReportData } from '../../hooks/useReportData';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

const HELP_BUTTON_CLASS =
  'inline-flex items-center justify-center min-h-9 min-w-9 rounded-full text-gray-400 hover:text-gray-600 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8C5A]/40';

const HELP_BODY_CLASS =
  'max-w-[260px] bg-gray-900 text-white text-xs text-left leading-snug px-3 py-2 border-0 shadow-lg';

function getMetricHelpMode(): 'tooltip' | 'popover' {
  if (typeof window === 'undefined') return 'tooltip';
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;
  return coarse || !canHover ? 'popover' : 'tooltip';
}

function subscribeMetricHelpMode(onStoreChange: () => void) {
  const mqCoarse = window.matchMedia('(pointer: coarse)');
  const mqHover = window.matchMedia('(hover: hover)');
  mqCoarse.addEventListener('change', onStoreChange);
  mqHover.addEventListener('change', onStoreChange);
  return () => {
    mqCoarse.removeEventListener('change', onStoreChange);
    mqHover.removeEventListener('change', onStoreChange);
  };
}

function useMetricHelpMode(): 'tooltip' | 'popover' {
  return React.useSyncExternalStore(subscribeMetricHelpMode, getMetricHelpMode, () => 'tooltip');
}

function MetricHelp({
  title,
  text,
  mode,
}: {
  title: string;
  text: string;
  mode: 'tooltip' | 'popover';
}) {
  const ariaLabel = `What is ${title}?`;

  if (mode === 'popover') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={HELP_BUTTON_CLASS} aria-label={ariaLabel}>
            <CircleHelp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="center"
          sideOffset={6}
          collisionPadding={12}
          className={HELP_BODY_CLASS}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {text}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className={HELP_BUTTON_CLASS} aria-label={ariaLabel}>
          <CircleHelp className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className={HELP_BODY_CLASS}>
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

const METRIC_TOOLTIPS = {
  totalSales:
    'Sum of all completed sale amounts in the selected period. Use this to see how much revenue the store earned.',
  transactions:
    'Count of completed sales in the selected period. A higher count means more customers checked out, even if each sale is small.',
  avgOrder:
    'Total sales divided by number of transactions. Shows the typical amount spent per checkout—useful for spotting upsell opportunities.',
  cogs:
    'Cost of Goods Sold: total product cost for items sold (unit cost × quantity from each line item). This is what you paid for inventory that left the shelf.',
  grossProfit:
    'Profit from sold items after product cost and line discounts, before expenses like rent, utilities, or payroll. Gross margin compares this to total sales.',
  netProfit:
    'Total sales minus cost of goods sold—the amount left after paying for inventory sold. Does not subtract operating expenses (rent, payroll); use Gross Profit when line discounts apply.',
} as const;

function formatComparison(change: number | null | undefined, label: string) {
  if (change == null) {
    if (change === null) {
      return { text: `New ${label}`, className: 'text-[#1E8C5A]' };
    }
    return { text: '—', className: 'text-gray-500' };
  }
  if (!Number.isFinite(change)) {
    return { text: '—', className: 'text-gray-500' };
  }
  const rounded = Math.abs(change) < 0.05 ? 0 : change;
  const sign = rounded > 0 ? '+' : '';
  const arrow = rounded > 0 ? '↑' : rounded < 0 ? '↓' : '→';
  const className =
    rounded > 0 ? 'text-[#1E8C5A]' : rounded < 0 ? 'text-red-600' : 'text-gray-500';
  return { text: `${sign}${rounded.toFixed(1)}% ${label} ${arrow}`, className };
}

export default function HeroMetrics({
  loading,
  data,
}: {
  loading?: boolean;
  data?: ReportData | null;
}) {
  const metricHelpMode = useMetricHelpMode();
  const totalSales = data?.totalSales ?? 0;
  const transactions = data?.transactionCount ?? 0;
  const avgOrder = data?.avgOrder ?? 0;
  const cogs = data?.cogs ?? 0;
  const grossProfit = data?.grossProfit ?? 0;
  const grossMargin = data?.grossMargin ?? 0;
  const netProfit = data?.netProfit ?? 0;
  const netMargin = data?.netMargin ?? 0;
  const comparisonLabel = data?.comparisonLabel ?? 'vs prior period';

  const resolveSubtitle = (change: number | null | undefined) => {
    if (loading) {
      return { text: 'Loading…', className: 'text-gray-500' };
    }
    if (!data) {
      return { text: '—', className: 'text-gray-500' };
    }
    return formatComparison(change, comparisonLabel);
  };

  const salesComparison = resolveSubtitle(data?.salesChange);
  const transactionsComparison = resolveSubtitle(data?.transactionsChange);
  const avgOrderComparison = resolveSubtitle(data?.avgOrderChange);
  const cogsComparison = resolveSubtitle(data?.cogsChange);
  const profitComparison = resolveSubtitle(data?.profitChange);
  const netProfitComparison = resolveSubtitle(data?.netProfitChange);

  const cogsSubtitle = (() => {
    if (loading) return { text: 'Loading…', className: 'text-gray-500' };
    if (!data) return { text: '—', className: 'text-gray-500' };
    const cogsPercent = totalSales > 0 ? (cogs / totalSales) * 100 : 0;
    return {
      text: `${cogsPercent.toFixed(1)}% of sales · ${cogsComparison.text}`,
      className: cogsComparison.className,
    };
  })();

  const profitSubtitle = (() => {
    if (loading) return { text: 'Loading…', className: 'text-gray-500' };
    if (!data) return { text: '—', className: 'text-gray-500' };
    return {
      text: `${grossMargin.toFixed(1)}% margin · ${profitComparison.text}`,
      className: profitComparison.className,
    };
  })();

  const netProfitSubtitle = (() => {
    if (loading) return { text: 'Loading…', className: 'text-gray-500' };
    if (!data) return { text: '—', className: 'text-gray-500' };
    return {
      text: `${netMargin.toFixed(1)}% margin · ${netProfitComparison.text}`,
      className: netProfitComparison.className,
    };
  })();

  const Card = ({
    title,
    tooltip,
    value,
    subtitle,
    subtitleClassName,
  }: {
    title: string;
    tooltip: string;
    value: string | number;
    subtitle: string;
    subtitleClassName?: string;
  }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center gap-1.5 text-sm text-gray-600">
        <span>{title}</span>
        <MetricHelp title={title} text={tooltip} mode={metricHelpMode} />
      </div>
      <div className="text-2xl font-semibold text-[#1E8C5A] mt-2">{loading ? '…' : value}</div>
      <div className={`text-xs mt-1 ${subtitleClassName ?? 'text-gray-500'}`}>{subtitle}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <Card
        title="Total Sales"
        tooltip={METRIC_TOOLTIPS.totalSales}
        value={`₱${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle={salesComparison.text}
        subtitleClassName={salesComparison.className}
      />
      <Card
        title="Transactions"
        tooltip={METRIC_TOOLTIPS.transactions}
        value={transactions}
        subtitle={transactionsComparison.text}
        subtitleClassName={transactionsComparison.className}
      />
      <Card
        title="Average Order"
        tooltip={METRIC_TOOLTIPS.avgOrder}
        value={`₱${avgOrder.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle={avgOrderComparison.text}
        subtitleClassName={avgOrderComparison.className}
      />
      <Card
        title="COGS (Cost of Goods Sold)"
        tooltip={METRIC_TOOLTIPS.cogs}
        value={`₱${cogs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle={cogsSubtitle.text}
        subtitleClassName={cogsSubtitle.className}
      />
      <Card
        title="Gross Profit"
        tooltip={METRIC_TOOLTIPS.grossProfit}
        value={`₱${grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle={profitSubtitle.text}
        subtitleClassName={profitSubtitle.className}
      />
      <Card
        title="Net Profit"
        tooltip={METRIC_TOOLTIPS.netProfit}
        value={`₱${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle={netProfitSubtitle.text}
        subtitleClassName={netProfitSubtitle.className}
      />
    </div>
  );
}

