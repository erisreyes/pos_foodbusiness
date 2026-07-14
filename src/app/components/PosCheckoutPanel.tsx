/**
 * Multi-step checkout UI: choose payment → cash keypad or cashless confirm → receipt.
 * Persists the sale via checkoutService.completeSale(); does not touch Supabase directly.
 */
import { useState, useEffect, useCallback } from 'react';
import { CartItem, PaymentMethod } from '../types/pos';
import { CheckCircle, ArrowLeft, Delete } from 'lucide-react';
import { Button } from './ui/button';
import { useConnectivity } from '../context/ConnectivityContext';
import { completeSale } from '../services/checkoutService';
import { cn } from './ui/utils';

const GREEN = '#15803d';
const CASH_QUICK_BILLS = [20, 50, 100, 200, 500, 1000] as const;

type CheckoutStep = 'choose-payment' | 'cash-details' | 'cashless-confirm';

function toCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}

function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}

type TenderedKeypadProps = {
  onDigit: (d: number) => void;
  onBackspace: () => void;
  onClear: () => void;
};

function TenderedKeypad({ onDigit, onBackspace, onClear }: TenderedKeypadProps) {
  const keys = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ] as const;

  const keyClass = cn(
    'min-h-[3.25rem] sm:min-h-16 rounded-2xl text-2xl sm:text-3xl font-semibold transition-colors touch-manipulation',
    'border-2 border-[#15803d]/25 bg-white text-[#1E3D2D] shadow-sm',
    'hover:bg-[#E8F5E9] hover:border-[#15803d]/50 active:bg-[#15803d] active:text-white active:border-[#15803d]',
  );

  const wideClass = cn(
    'min-h-[3.25rem] sm:min-h-16 rounded-2xl text-base sm:text-lg font-semibold transition-colors touch-manipulation',
    'border-2 border-[#15803d]/25 bg-white text-[#1E3D2D] shadow-sm',
    'hover:bg-[#E8F5E9] hover:border-[#15803d]/50 active:bg-[#15803d] active:text-white active:border-[#15803d]',
  );

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-600">Keypad</p>
      <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-md mx-auto lg:mx-0">
        {keys.map((row) =>
          row.map((d) => (
            <button key={d} type="button" className={keyClass} onClick={() => onDigit(d)}>
              {d}
            </button>
          )),
        )}
        <button type="button" className={wideClass} onClick={onClear}>
          Clear
        </button>
        <button type="button" className={keyClass} onClick={() => onDigit(0)}>
          0
        </button>
        <button
          type="button"
          className={cn(wideClass, 'flex items-center justify-center')}
          onClick={onBackspace}
          aria-label="Backspace"
        >
          <Delete className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
      </div>
    </div>
  );
}

export type PosCheckoutPanelProps = {
  open: boolean;
  items: CartItem[];
  cashierId: string;
  branch?: string;
  onComplete: (
    paymentMethod: PaymentMethod,
    receipt: { txnNumber: string; change: number; offline?: boolean },
  ) => void;
  onCancel: () => void;
};

export function PosCheckoutPanel({
  open,
  items,
  cashierId,
  branch,
  onComplete,
  onCancel,
}: PosCheckoutPanelProps) {
  const { isOnline, refreshOutboxCounts } = useConnectivity();
  const [step, setStep] = useState<CheckoutStep>('choose-payment');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [tenderedCents, setTenderedCents] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<{ txnNumber: string; change: number } | null>(null);

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const total = subtotal;
  const totalCents = toCents(total);
  const tenderedAmount = tenderedCents / 100;
  const change =
    selectedMethod === 'cash' && tenderedCents >= totalCents ? (tenderedCents - totalCents) / 100 : 0;
  const isShortCash = selectedMethod === 'cash' && tenderedCents > 0 && tenderedCents < totalCents;
  const canCompleteCash = selectedMethod === 'cash' && tenderedCents >= totalCents;

  useEffect(() => {
    if (!open) return;
    setStep('choose-payment');
    setSelectedMethod(null);
    setTenderedCents(0);
    setError(null);
    setIsComplete(false);
    setIsProcessing(false);
    setReceiptData(null);
  }, [open]);

  const resetState = useCallback(() => {
    setStep('choose-payment');
    setSelectedMethod(null);
    setTenderedCents(0);
    setError(null);
    setReceiptData(null);
    setIsComplete(false);
  }, []);

  const requestCancel = () => {
    if (isProcessing || isComplete) return;
    resetState();
    onCancel();
  };

  const appendDigit = (d: number) => {
    setError(null);
    setTenderedCents((c) => Math.min(999_999_999, c * 10 + d));
  };

  const backspaceCents = () => {
    setError(null);
    setTenderedCents((c) => Math.floor(c / 10));
  };

  const clearCents = () => {
    setError(null);
    setTenderedCents(0);
  };

  const setTenderedExactAmount = () => {
    setError(null);
    setTenderedCents(totalCents);
  };

  const addTenderedBill = (bill: number) => {
    setError(null);
    setTenderedCents((c) => c + toCents(bill));
  };

  const handlePayment = async () => {
    if (!selectedMethod || (selectedMethod !== 'cash' && selectedMethod !== 'cashless')) {
      setError('Select a payment method.');
      return;
    }
    if (selectedMethod === 'cash') {
      if (tenderedCents < totalCents) {
        setError('Enter amount tendered at least equal to the total due.');
        return;
      }
    }

    setIsProcessing(true);
    setError(null);

    try {
      const receipt = await completeSale({
        items,
        cashierId,
        branch,
        paymentMethod: selectedMethod,
        tenderedCents,
        totalCents,
        subtotal,
        total,
        isOnline,
      });
      await refreshOutboxCounts();
      setReceiptData(receipt);
      setIsComplete(true);

      setTimeout(() => {
        onComplete(selectedMethod, receipt);
      }, 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const chooseCash = () => {
    setSelectedMethod('cash');
    setStep('cash-details');
    setTenderedCents(0);
    setError(null);
  };

  const chooseCashless = () => {
    setSelectedMethod('cashless');
    setStep('cashless-confirm');
    setError(null);
  };

  const goBackToChoose = () => {
    setStep('choose-payment');
    setSelectedMethod(null);
    setTenderedCents(0);
    setError(null);
  };

  if (!open) return null;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div
        className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-[#E8EFED]"
        style={{ borderBottomColor: `${GREEN}33` }}
      >
        <h2 className="text-lg font-bold text-[#1E3D2D] tracking-tight">Complete payment</h2>
        <button
          type="button"
          onClick={requestCancel}
          disabled={isProcessing || isComplete}
          className="text-sm font-semibold text-[#15803d] hover:underline disabled:opacity-40 touch-manipulation px-2 py-1"
        >
          Back to cart
        </button>
      </div>

      {isComplete ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[280px]">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-[#15803d]/10">
            <CheckCircle className="w-12 h-12" style={{ color: GREEN }} />
          </div>
          <h3 className="text-2xl font-bold text-[#2C3E2E]">Payment successful</h3>
          {receiptData && selectedMethod === 'cash' && receiptData.change > 0 && (
            <p className="text-sm text-gray-600 mt-2">Change: ₱{receiptData.change.toFixed(2)}</p>
          )}
          <p className="text-xs text-gray-500 mt-4">Returning to cart…</p>
        </div>
      ) : (
        <>
          {error && (
            <div className="shrink-0 mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-2 lg:gap-6 lg:items-stretch p-4 lg:p-5">
            {/* Left column: summary + payment choice */}
            <div className="flex min-h-0 flex-col gap-4 lg:h-full">
              <div className="flex min-h-0 flex-1 flex-col rounded-2xl border-2 border-[#E8EFED] p-4 bg-[#FAFCFA]">
                <h3 className="shrink-0 font-semibold text-[#1E3D2D] mb-3">Order summary</h3>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-2 pr-1 max-lg:min-h-[12rem]">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex justify-between text-sm gap-2">
                      <span className="text-gray-600 truncate">
                        {item.quantity}× {item.product.name}
                      </span>
                      <span className="font-semibold text-[#2C3E2E] shrink-0">
                        ₱{(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="shrink-0 flex justify-between items-center mt-3 pt-3 border-t-2 border-[#E8EFED]">
                  <span className="font-bold text-[#1E3D2D]">Total due</span>
                  <span className="font-bold text-2xl tabular-nums" style={{ color: GREEN }}>
                    ₱{total.toFixed(2)}
                  </span>
                </div>
              </div>

              {step === 'choose-payment' && (
                <div className="shrink-0 space-y-2">
                  <p className="text-sm font-medium text-[#2C3E2E]">Payment method</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={chooseCash}
                      className={cn(
                        'rounded-2xl border-2 p-4 text-left min-h-[88px] touch-manipulation transition-colors',
                        'border-[#15803d]/30 hover:border-[#15803d] hover:bg-[#E8F5E9]',
                      )}
                    >
                      <span className="block text-lg font-bold text-[#1E3D2D]">Cash</span>
                      <span className="text-xs text-gray-600">Keypad &amp; change</span>
                    </button>
                    <button
                      type="button"
                      onClick={chooseCashless}
                      className={cn(
                        'rounded-2xl border-2 p-4 text-left min-h-[88px] touch-manipulation transition-colors',
                        'border-[#15803d]/30 hover:border-[#15803d] hover:bg-[#E8F5E9]',
                      )}
                    >
                      <span className="block text-lg font-bold text-[#1E3D2D]">Cashless</span>
                      <span className="text-xs text-gray-600">GCash / Maya</span>
                    </button>
                  </div>
                </div>
              )}

              {step === 'cash-details' && (
                <div className="shrink-0 space-y-3">
                  <button
                    type="button"
                    onClick={goBackToChoose}
                    className="inline-flex items-center gap-2 text-sm font-semibold touch-manipulation"
                    style={{ color: GREEN }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Change method
                  </button>
                  <p className="text-xs text-gray-600">
                    Use the keypad to enter cash received (cent-by-cent, like an ATM). Quick bills add to the amount.
                    Minimum equals total due.
                  </p>
                  <div className="rounded-2xl border-2 border-[#15803d]/20 bg-[#F4F8F3] p-4">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Amount tendered</p>
                    <p className="text-3xl sm:text-4xl font-bold tabular-nums mt-1" style={{ color: GREEN }}>
                      ₱{centsToDisplay(tenderedCents)}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        onClick={setTenderedExactAmount}
                        className="min-h-10 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm touch-manipulation"
                        style={{ backgroundColor: GREEN }}
                      >
                        Exact Amount
                      </button>
                      {CASH_QUICK_BILLS.map((bill) => (
                        <button
                          key={bill}
                          type="button"
                          onClick={() => addTenderedBill(bill)}
                          className="min-h-10 rounded-full border-2 border-[#15803d]/30 bg-white px-3 py-2 text-sm font-semibold text-[#1E3D2D] touch-manipulation hover:bg-[#E8F5E9]"
                        >
                          ₱{bill}
                        </button>
                      ))}
                    </div>
                  </div>
                  {tenderedCents > 0 && (
                    <div className="rounded-xl border border-[#E8EFED] px-3 py-2 flex justify-between text-sm">
                      <span className="text-gray-600">Change</span>
                      <span
                        className={cn('font-bold text-lg tabular-nums', tenderedCents >= totalCents ? '' : 'text-red-600')}
                        style={tenderedCents >= totalCents ? { color: GREEN } : undefined}
                      >
                        ₱{tenderedCents >= totalCents ? change.toFixed(2) : '0.00'}
                      </span>
                    </div>
                  )}
                  {isShortCash && (
                    <p className="text-xs text-red-600">
                      Short by ₱{((totalCents - tenderedCents) / 100).toFixed(2)} — keep entering or use Exact Amount.
                    </p>
                  )}
                </div>
              )}

              {step === 'cashless-confirm' && (
                <div className="shrink-0 space-y-3">
                  <button
                    type="button"
                    onClick={goBackToChoose}
                    className="inline-flex items-center gap-2 text-sm font-semibold touch-manipulation"
                    style={{ color: GREEN }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Change method
                  </button>
                  <div className="rounded-2xl border-2 border-[#15803d]/20 bg-[#E8F5E9] p-4 text-sm text-[#1E3D2E]">
                    <p className="font-semibold">Cashless (GCash / Maya)</p>
                    <p className="mt-2 text-gray-700">
                      Total{' '}
                      <span className="font-bold tabular-nums" style={{ color: GREEN }}>
                        ₱{total.toFixed(2)}
                      </span>{' '}
                      will be recorded as paid via cashless.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right column: keypad (cash only) or spacer for cashless */}
            <div className="mt-6 lg:mt-0 flex flex-col min-h-0 lg:border-l lg:border-[#E8EFED] lg:pl-6">
              {step === 'cash-details' ? (
                <TenderedKeypad onDigit={appendDigit} onBackspace={backspaceCents} onClear={clearCents} />
              ) : (
                <div className="hidden lg:flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-[#15803d]/20 bg-[#FAFCFA] text-sm text-gray-500 p-6 text-center">
                  {step === 'choose-payment'
                    ? 'Select Cash to use the keypad, or Cashless to confirm.'
                    : 'Review and tap Complete payment below.'}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-[#E8EFED] bg-[#F8FBF8] p-4 flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={requestCancel}
              disabled={isProcessing}
              className="flex-1 min-h-12 rounded-2xl border-2 border-[#15803d]/30 text-[#1E3D2D] hover:bg-[#E8F5E9]"
            >
              Cancel
            </Button>
            {step === 'choose-payment' ? (
              <Button type="button" disabled className="flex-1 min-h-12 rounded-2xl opacity-50">
                Select payment method
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handlePayment}
                disabled={isProcessing || (step === 'cash-details' && !canCompleteCash)}
                className="flex-1 min-h-12 rounded-2xl text-white font-semibold shadow-md touch-manipulation disabled:opacity-50"
                style={{ backgroundColor: GREEN }}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing…
                  </span>
                ) : (
                  'Complete payment'
                )}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
