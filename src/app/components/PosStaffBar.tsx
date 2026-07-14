import { Camera } from 'lucide-react';
import { LogoutButton } from './LogoutButton';
import { NetworkStatusBadge } from './NetworkStatusBadge';
import { cn } from './ui/utils';

export type PosStaffBarProps = {
  onLogout: () => void | Promise<void>;
  logoutWarning?: string;
  onScanClick?: () => void;
  safeAreaTop?: boolean;
  showNetworkBadge?: boolean;
};

export function PosStaffBar({
  onLogout,
  logoutWarning,
  onScanClick,
  safeAreaTop,
  showNetworkBadge = false,
}: PosStaffBarProps) {
  return (
    <header
      className={cn(
        'shrink-0 bg-[#1E8C5A] text-white shadow-lg',
        safeAreaTop && 'pt-[env(safe-area-inset-top)]',
      )}
    >
      <div className="px-3 py-3 lg:px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="text-2xl">🐾</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold">POS Demo</h1>
            <p className="text-xs text-white/80">Point of Sale</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showNetworkBadge && <NetworkStatusBadge />}

          {onScanClick && (
            <button
              type="button"
              onClick={onScanClick}
              className="min-h-11 min-w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition touch-manipulation"
              title="Scan barcode"
              aria-label="Scan barcode"
            >
              <Camera className="w-5 h-5" />
            </button>
          )}

          <LogoutButton onLogout={onLogout} warning={logoutWarning} />
        </div>
      </div>
    </header>
  );
}
