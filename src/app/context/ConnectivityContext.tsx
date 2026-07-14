/**
 * Connectivity context — online/offline detection and outbox sync orchestration.
 *
 * isOnline is true only when navigator.onLine AND a lightweight Supabase probe succeeds.
 * When connectivity returns, pending offline sales are pushed via syncOutboxSales().
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { countFailedOutbox, countPendingOutbox } from '../offline/db';
import { syncOutboxSales, type SyncResult } from '../offline/syncEngine';

/** Re-check Supabase reachability while the tab is visible. */
const HEARTBEAT_INTERVAL_MS = 45_000;

type ConnectivityContextValue = {
  isOnline: boolean;
  isOffline: boolean;
  pendingSyncCount: number;
  failedSyncCount: number;
  isSyncing: boolean;
  lastCatalogSync: string | null;
  lastHeartbeatAt: string | null;
  refreshOutboxCounts: () => Promise<void>;
  runSync: () => Promise<SyncResult>;
  checkConnectivity: () => Promise<boolean>;
};

const ConnectivityContext = createContext<ConnectivityContextValue | null>(null);

async function probeSupabase(): Promise<boolean> {
  if (!navigator.onLine) return false;

  try {
    const { error } = await supabase.from('categories').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [failedSyncCount, setFailedSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastCatalogSync, setLastCatalogSync] = useState<string | null>(null);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);
  const syncStartedRef = useRef(false);

  const refreshOutboxCounts = useCallback(async () => {
    const [pending, failed] = await Promise.all([countPendingOutbox(), countFailedOutbox()]);
    setPendingSyncCount(pending);
    setFailedSyncCount(failed);
  }, []);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    const ok = await probeSupabase();
    setIsOnline(ok);
    if (ok) setLastHeartbeatAt(new Date().toISOString());
    return ok;
  }, []);

  const runSync = useCallback(async () => {
    if (!isOnline) {
      return { synced: 0, failed: 0, skipped: 0 };
    }

    setIsSyncing(true);
    try {
      const result = await syncOutboxSales();
      await refreshOutboxCounts();
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, refreshOutboxCounts]);

  const handleOnline = useCallback(async () => {
    const ok = await checkConnectivity();
    await refreshOutboxCounts();

    if (ok) {
      const pending = await countPendingOutbox();
      if (pending > 0) {
        toast.info(`Back online — syncing ${pending} transaction${pending === 1 ? '' : 's'}…`);
        const result = await runSync();
        if (result.synced > 0) {
          toast.success(`Synced ${result.synced} offline sale${result.synced === 1 ? '' : 's'}`);
        }
        if (result.failed > 0) {
          toast.error(`${result.failed} sale${result.failed === 1 ? '' : 's'} failed to sync`);
        }
      }
    }
  }, [checkConnectivity, refreshOutboxCounts, runSync]);

  useEffect(() => {
    void refreshOutboxCounts();
    void checkConnectivity();

    const onOnline = () => void handleOnline();
    const onOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkConnectivity().then((ok) => {
          if (ok) void refreshOutboxCounts();
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void checkConnectivity();
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(heartbeat);
    };
  }, [checkConnectivity, handleOnline, refreshOutboxCounts]);

  useEffect(() => {
    if (isOnline && pendingSyncCount > 0 && !syncStartedRef.current) {
      syncStartedRef.current = true;
      void runSync().finally(() => {
        syncStartedRef.current = false;
      });
    }
  }, [isOnline, pendingSyncCount, runSync]);

  return (
    <ConnectivityContext.Provider
      value={{
        isOnline,
        isOffline: !isOnline,
        pendingSyncCount,
        failedSyncCount,
        isSyncing,
        lastCatalogSync,
        lastHeartbeatAt,
        refreshOutboxCounts,
        runSync,
        checkConnectivity,
      }}
    >
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity(): ConnectivityContextValue {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) {
    throw new Error('useConnectivity must be used within ConnectivityProvider');
  }
  return ctx;
}
