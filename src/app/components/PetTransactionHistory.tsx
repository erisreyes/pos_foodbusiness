import { Transaction } from '../types/pos';
import { Receipt, Clock, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { format } from 'date-fns';

interface PetTransactionHistoryProps {
  transactions: Transaction[];
}

export function PetTransactionHistory({ transactions }: PetTransactionHistoryProps) {
  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Cash';
      case 'cashless':
        return 'Cashless (GCash / Maya)';
      case 'card':
        return 'Card';
      case 'mobile':
        return 'Mobile';
      default:
        return method;
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return Banknote;
      case 'cashless': return Smartphone;
      case 'card': return CreditCard;
      case 'mobile': return Smartphone;
      default: return CreditCard;
    }
  };

  const getPaymentColor = (method: string) => {
    switch (method) {
      case 'cash': return 'bg-[#7BA886]';
      case 'cashless': return 'bg-[#0D9488]';
      case 'card': return 'bg-[#6B9BD1]';
      case 'mobile': return 'bg-[#D4866A]';
      default: return 'bg-gray-500';
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-[#F5F1E8]">
        <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center mb-6 shadow-lg">
          <Receipt className="w-16 h-16 text-[#7BA886]" />
        </div>
        <h3 className="text-xl font-semibold text-[#2C3E2E] mb-2">No transactions yet</h3>
        <p className="text-gray-500 text-center mb-6">
          Start selling to see your transaction history here
        </p>
        
        {/* Decorative paw prints */}
        <div className="flex gap-6 opacity-30">
          <span className="text-5xl animate-paw">🐾</span>
          <span className="text-5xl animate-paw" style={{ animationDelay: '0.3s' }}>🐾</span>
          <span className="text-5xl animate-paw" style={{ animationDelay: '0.6s' }}>🐾</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F1E8] h-full">
      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[#2C3E2E] mb-1">Transaction History</h2>
          <p className="text-sm text-gray-600">{transactions.length} total transactions</p>
        </div>
        
        <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
          {transactions.map((transaction) => {
            const PaymentIcon = getPaymentIcon(transaction.paymentMethod);
            const paymentColor = getPaymentColor(transaction.paymentMethod);
            
            return (
              <div
                key={transaction.id}
                className="bg-white rounded-2xl border-2 border-[#E8DFD0] p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl ${paymentColor} flex items-center justify-center text-white shadow-md`}>
                      <PaymentIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#2C3E2E]">
                        Transaction #{transaction.id.slice(-6)}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{format(new Date(transaction.timestamp), 'MMM dd, yyyy • HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xl text-[#7BA886]">
                      ₱{transaction.total.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatPaymentMethod(transaction.paymentMethod)}
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-100 pt-3 space-y-1.5">
                  {transaction.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600 flex-1">
                        <span className="font-semibold text-[#2C3E2E]">{item.quantity}x</span>{' '}
                        {item.product.name}
                      </span>
                      <span className="font-semibold text-gray-700 ml-2">
                        ₱{(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {transaction.items.length} item{transaction.items.length > 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    ✓ Completed
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
