/**
 * Staff login modal. Users sign in with username (looked up in profiles) + password.
 * On success, Supabase Auth session is created and AuthContext receives cashierId + role.
 */
import { useState, useEffect, type FormEvent } from 'react';
import { Briefcase, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { supabase } from '../../lib/supabase';
import { cn } from './ui/utils';

export interface Member {
  id: string;
  name: string;
  role: 'admin' | 'staff' | 'manager';
  phone: string;
}

interface UserLoginProps {
  isOpen: boolean;
  onClose?: () => void;
  onLogin: (member: Member) => void;
  isRequired?: boolean;
}

const touchInputClass =
  'mt-2 min-h-12 rounded-2xl border-[#D4E8DA] bg-white text-base shadow-sm focus-visible:border-[#1E8C5A] focus-visible:ring-[#1E8C5A]/25 touch-manipulation';

const fieldLabelClass = 'text-base font-semibold text-[#2C3E2E]';

/** Dev-only login prefill from .env.local (VITE_DEMO_USERNAME / VITE_DEMO_PASSWORD). */
function getDemoCredentials(): { username: string; password: string } {
  if (!import.meta.env.DEV) return { username: '', password: '' };
  return {
    username: (import.meta.env.VITE_DEMO_USERNAME as string | undefined) ?? '',
    password: (import.meta.env.VITE_DEMO_PASSWORD as string | undefined) ?? '',
  };
}

export function UserLogin({ isOpen, onClose, onLogin, isRequired = false }: UserLoginProps) {
  const demo = getDemoCredentials();
  const [username, setUsername] = useState(demo.username);
  const [password, setPassword] = useState(demo.password);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const { username: u, password: p } = getDemoCredentials();
      if (u || p) {
        setUsername(u);
        setPassword(p);
      }
    }
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
    if (!open && !isRequired && onClose) {
      onClose();
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const trimmedUsername = username.trim();
      const { data: profileLookup, error: lookupError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', trimmedUsername)
        .maybeSingle();

      if (lookupError) {
        setError('Unable to verify username. Please try again.');
        setIsLoading(false);
        return;
      }

      if (!profileLookup?.email) {
        setError('Username not found. Please check your credentials and try again.');
        setIsLoading(false);
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: profileLookup.email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const member = profileData
          ? {
              id: profileData.id,
              name: profileData.full_name || trimmedUsername,
              role: profileData.role || 'staff',
              phone: profileData.phone || '',
            }
          : {
              id: data.user.id,
              name:
                data.user.user_metadata?.full_name ||
                data.user.email?.split('@')[0] ||
                'Staff Member',
              role: 'staff' as const,
              phone: '',
            };

        if (profileError && !profileData) {
          console.warn('Profile lookup failed, falling back to auth user:', profileError);
        }

        onLogin(member);
        setUsername('');
        setPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'flex w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-3xl border-[#D4E8DA] bg-[#F4F8F3] p-0 shadow-xl',
          'top-[max(1rem,env(safe-area-inset-top))] left-1/2 max-h-[min(90dvh,640px)] -translate-x-1/2 translate-y-0',
          'sm:max-w-md md:max-w-lg',
          '[&>button]:hidden',
        )}
        onPointerDownOutside={isRequired ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={isRequired ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader className="shrink-0 border-b border-[#D4E8DA] bg-[#1E8C5A] px-5 py-5 text-left text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 pr-2">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                <Briefcase className="h-5 w-5 shrink-0 text-white/90" aria-hidden />
                Staff Portal test
              </DialogTitle>
              <DialogDescription className="text-sm text-white/85">
                Sign in with your username and password to continue.
              </DialogDescription>
            </div>
            {!isRequired && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 min-w-11 shrink-0 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition touch-manipulation"
                aria-label="Close login"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleLogin} className="flex min-h-0 flex-1 flex-col">
          <div
            className="flex-1 overflow-y-auto overscroll-contain px-5 py-6 space-y-5 scroll-pb-32"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div>
              <label htmlFor="username" className={fieldLabelClass}>
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className={touchInputClass}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                enterKeyHint="next"
              />
            </div>

            <div>
              <label htmlFor="password" className={fieldLabelClass}>
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={touchInputClass}
                autoComplete="current-password"
                enterKeyHint="go"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {error}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[#D4E8DA] bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="submit"
              disabled={isLoading || !username?.trim() || !password?.trim()}
              className="min-h-12 w-full rounded-2xl bg-[#1E8C5A] text-base font-semibold text-white hover:bg-[#166c44] touch-manipulation"
            >
              {isLoading ? 'Authenticating...' : 'Login'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default UserLogin;
