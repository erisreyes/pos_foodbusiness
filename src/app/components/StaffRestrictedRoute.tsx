import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { isStaff } from '../constants/roles';

type StaffRestrictedRouteProps = {
  children: React.ReactNode;
};

/**
 * Route guard for admin/manager-only pages.
 * Staff (cashiers) are redirected to `/` with a toast — they only use the POS screen.
 */
export function StaffRestrictedRoute({ children }: StaffRestrictedRouteProps) {
  const { userRole, authLoading } = useAuth();
  const deniedToastShown = useRef(false);

  const accessDenied = !authLoading && isStaff(userRole);

  useEffect(() => {
    if (accessDenied && !deniedToastShown.current) {
      deniedToastShown.current = true;
      toast.error('You do not have access to this page');
    }
  }, [accessDenied]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F4F8F3] flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (accessDenied) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
