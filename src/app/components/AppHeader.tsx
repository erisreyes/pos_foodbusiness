import { Camera, List, Menu } from 'lucide-react';
import { LogoutButton } from './LogoutButton';
import { useLocation, useNavigate } from 'react-router-dom';
import { APP_NAV_ITEMS, getNavSubtitle } from '../constants/appNav';
import { useAuth } from '../context/AuthContext';
import { isStaff } from '../constants/roles';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './ui/drawer';
import { NetworkStatusBadge } from './NetworkStatusBadge';
import { cn } from './ui/utils';

export type AppHeaderProps = {
  /** Override route-based subtitle when needed */
  subtitle?: string;
  onLogout: () => void | Promise<void>;
  /** Shown in the sign-out confirmation dialog when relevant */
  logoutWarning?: string;
  onScanClick?: () => void;
  safeAreaTop?: boolean;
  showNetworkBadge?: boolean;
};

export function AppHeader({
  subtitle: subtitleOverride,
  onLogout,
  logoutWarning,
  onScanClick,
  safeAreaTop,
  showNetworkBadge = false,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { userRole } = useAuth();

  if (isStaff(userRole)) {
    return null;
  }

  const subtitle = subtitleOverride ?? getNavSubtitle(pathname);
  const activeId = APP_NAV_ITEMS.find((item) => item.path === pathname)?.id ?? 'pos';
  const showExtraActions = pathname !== '/' && !onScanClick;

  return (
    <header
      className={cn(
        'shrink-0 bg-[#1E8C5A] text-white shadow-lg',
        safeAreaTop && 'pt-[env(safe-area-inset-top)]',
      )}
    >
      <div className="px-3 py-3 lg:px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Drawer direction="left">
            <DrawerTrigger asChild>
              <button
                type="button"
                className="min-h-11 min-w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition touch-manipulation"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </DrawerTrigger>

            <DrawerContent className="bg-white">
              <DrawerHeader>
                <DrawerTitle>Menu</DrawerTitle>
                <p className="text-sm text-gray-500">Quick navigation</p>
              </DrawerHeader>

              <div className="px-4 pb-4">
                <nav className="space-y-2">
                  {APP_NAV_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg font-semibold',
                        activeId === item.id
                          ? 'bg-[#E7F7EE] text-[#1E8C5A]'
                          : 'text-gray-700 hover:bg-[#F8FAF8]',
                      )}
                    >
                      {item.name}
                    </button>
                  ))}

                  <div className="mt-3">
                    <DrawerClose asChild>
                      <button
                        type="button"
                        className="w-full rounded-2xl border border-[#E8DFD0] bg-[#F5F7F3] py-3 text-sm font-semibold text-[#2C3E2E]"
                      >
                        Close
                      </button>
                    </DrawerClose>
                  </div>
                </nav>
              </div>
            </DrawerContent>
          </Drawer>

          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="text-2xl">🐾</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold">POS Demo</h1>
            <p className="text-xs text-white/80">{subtitle}</p>
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

          {showExtraActions && (
            <>
              <button
                type="button"
                className="hidden md:flex min-h-11 min-w-11 rounded-2xl bg-white/15 hover:bg-white/25 items-center justify-center transition"
                aria-hidden
                tabIndex={-1}
              >
                <Camera className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="hidden md:flex min-h-11 min-w-11 rounded-2xl bg-white/15 hover:bg-white/25 items-center justify-center transition"
                aria-hidden
                tabIndex={-1}
              >
                <List className="w-5 h-5" />
              </button>
            </>
          )}

          <LogoutButton onLogout={onLogout} warning={logoutWarning} />
        </div>
      </div>
    </header>
  );
}
