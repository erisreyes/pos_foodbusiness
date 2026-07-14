import { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useConnectivity } from '../context/ConnectivityContext';
import { getFailedSales } from '../offline/syncEngine';
import type { OutboxSale } from '../offline/types';
import { cn } from './ui/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet';
import { Button } from './ui/button';
import { toast } from 'sonner';

export function NetworkStatusBadge() {
  const {
    isOnline,
    isOffline,
    pendingSyncCount,
    failedSyncCount,
    isSyncing,
    runSync,
    refreshOutboxCounts,
  } = useConnectivity();

  const [failedSheetOpen, setFailedSheetOpen] = useState(false);
  const [failedSales, setFailedSales] = useState<OutboxSale[]>([]);

  const openFailedSheet = async () => {
    const sales = await getFailedSales();
    setFailedSales(sales);
    setFailedSheetOpen(true);
  };

  const handleSyncNow = async () => {
    if (isOffline) {
      toast.error('Cannot sync while offline');
      return;
    }
    const result = await runSync();
    await refreshOutboxCounts();
    if (result.synced > 0) {
      toast.success(`Synced ${result.synced} transaction${result.synced === 1 ? '' : 's'}`);
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} transaction${result.failed === 1 ? '' : 's'} failed to sync`);
    }
    if (result.synced === 0 && result.failed === 0 && pendingSyncCount === 0) {
      toast.info('Nothing to sync');
    }
  };

  let label = 'Online';
  let badgeClass = 'bg-white/20 text-white border-white/30';

  if (isOffline) {
    label = 'Offline mode';
    badgeClass = 'bg-red-500/30 text-white border-red-300/40';
  } else if (isSyncing) {
    label = 'Syncing…';
    badgeClass = 'bg-amber-400/30 text-white border-amber-200/40';
  } else if (failedSyncCount > 0) {
    label = `${failedSyncCount} failed`;
    badgeClass = 'bg-amber-500/40 text-white border-amber-200/50';
  } else if (pendingSyncCount > 0) {
    label = `${pendingSyncCount} pending`;
    badgeClass = 'bg-amber-400/30 text-white border-amber-200/40';
  }

  const Icon = isOffline ? CloudOff : isSyncing ? RefreshCw : failedSyncCount > 0 ? AlertTriangle : Cloud;

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            if (failedSyncCount > 0) void openFailedSheet();
            else if (pendingSyncCount > 0 && isOnline) void handleSyncNow();
          }}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition touch-manipulation',
            badgeClass,
            isSyncing && '[&_svg]:animate-spin',
          )}
          title={
            isOffline
              ? 'Working offline — sales will sync when back online'
              : pendingSyncCount > 0
                ? 'Tap to sync pending sales'
                : 'Connected'
          }
        >
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="max-w-[7rem] truncate sm:max-w-none">{label}</span>
        </button>

        {isOnline && (pendingSyncCount > 0 || failedSyncCount > 0) && !isSyncing && (
          <button
            type="button"
            onClick={() => void handleSyncNow()}
            className="min-h-9 min-w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center touch-manipulation"
            aria-label="Sync now"
            title="Sync now"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>

      <Sheet open={failedSheetOpen} onOpenChange={setFailedSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70dvh]">
          <SheetHeader>
            <SheetTitle>Failed to sync</SheetTitle>
            <SheetDescription>
              These offline sales could not be uploaded. Resolve stock issues in Inventory, then retry.
            </SheetDescription>
          </SheetHeader>
          <ul className="mt-4 space-y-3 overflow-y-auto max-h-[50dvh]">
            {failedSales.map((sale) => (
              <li
                key={sale.id}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm"
              >
                <p className="font-semibold text-[#2C3E2E]">
                  {sale.payload.header.transaction_number}
                </p>
                <p className="text-gray-600">
                  ₱{sale.payload.header.total_amount.toFixed(2)} ·{' '}
                  {new Date(sale.createdAt).toLocaleString()}
                </p>
                {sale.lastError ? (
                  <p className="mt-1 text-red-700 text-xs">{sale.lastError}</p>
                ) : null}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            className="mt-4 w-full min-h-11 rounded-xl bg-[#1E8C5A]"
            onClick={() => {
              setFailedSheetOpen(false);
              void handleSyncNow();
            }}
          >
            Retry sync
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
