import { REPORT_NAV_LABEL } from './reportNav';

export type AppNavId = 'pos' | 'inventory' | 'reports' | 'users';

export type AppNavItem = {
  id: AppNavId;
  name: string;
  path: string;
  subtitle: string;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { id: 'pos', name: 'Point of Sale', path: '/', subtitle: 'Point of Sale' },
  { id: 'inventory', name: 'Inventory Management', path: '/inventory', subtitle: 'Inventory' },
  { id: 'reports', name: REPORT_NAV_LABEL, path: '/reports', subtitle: REPORT_NAV_LABEL },
  { id: 'users', name: 'User Management', path: '/users', subtitle: 'User Management' },
];

export function getNavSubtitle(pathname: string): string {
  return APP_NAV_ITEMS.find((item) => item.path === pathname)?.subtitle ?? 'Point of Sale';
}
