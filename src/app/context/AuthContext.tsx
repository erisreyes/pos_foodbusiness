/**
 * Authentication context — tracks the signed-in cashier and their role.
 *
 * Flow: Supabase Auth session → cashierId → profiles.role lookup.
 * Components use useAuth() instead of calling supabase.auth directly.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import type { UserRole } from '../constants/roles';

type AuthContextValue = {
  cashierId: string | null;
  userRole: UserRole | null;
  authLoading: boolean;
  setCashierId: (id: string | null) => void;
  setUserRole: (role: UserRole | null) => void;
  refreshRole: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cashierId, setCashierId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const refreshRole = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!error && profile?.role) {
        setUserRole(profile.role as UserRole);
      } else {
        setUserRole(null);
      }
    } catch (err) {
      setUserRole(null);
      console.error('Failed to fetch user role:', err);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign out failed:', err);
    }
    setCashierId(null);
    setUserRole(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    const applySession = (userId: string | null) => {
      if (!mounted) return;
      setCashierId(userId);
      if (userId) {
        void refreshRole(userId);
      } else {
        setUserRole(null);
      }
    };

    const initialize = async () => {
      setAuthLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        applySession(session?.user?.id ?? null);
      } catch (err) {
        console.error('Failed to initialize auth session:', err);
        if (mounted) {
          setCashierId(null);
          setUserRole(null);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setCashierId(null);
        setUserRole(null);
        return;
      }

      if (session?.user) {
        setCashierId(session.user.id);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          void refreshRole(session.user.id);
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [refreshRole]);

  return (
    <AuthContext.Provider
      value={{
        cashierId,
        userRole,
        authLoading,
        setCashierId,
        setUserRole,
        refreshRole,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
