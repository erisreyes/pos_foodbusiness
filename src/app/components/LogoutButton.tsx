import { useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { cn } from './ui/utils';

export type LogoutButtonProps = {
  onLogout: () => void | Promise<void>;
  /** Optional extra warning (e.g. items still in cart) */
  warning?: string;
  className?: string;
};

export function LogoutButton({ onLogout, warning, className }: LogoutButtonProps) {
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
      setOpen(false);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'min-h-11 min-w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition touch-manipulation',
          className,
        )}
        title="Sign out"
        aria-label="Sign out"
      >
        <User className="w-5 h-5" />
      </button>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!isLoggingOut) setOpen(next);
        }}
      >
        <AlertDialogContent className="rounded-2xl border-[#E6ECE7] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1E3D2D]">Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to use the app.
            </AlertDialogDescription>
            {warning ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                {warning}
              </p>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={isLoggingOut}
              className="min-h-11 rounded-xl touch-manipulation"
            >
              Stay signed in
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={isLoggingOut}
              className="min-h-11 gap-2 rounded-xl bg-[#1E8C5A] text-white hover:bg-[#166c44] touch-manipulation"
              onClick={() => void handleConfirm()}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {isLoggingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
