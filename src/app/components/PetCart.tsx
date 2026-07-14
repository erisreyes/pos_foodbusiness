import { CartItem } from '../types/pos';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';

interface PetCartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
}

export function PetCart({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
}: PetCartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = subtotal;

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
        <div className="w-24 h-24 rounded-full bg-[#F5F1E8] flex items-center justify-center mb-4">
          <ShoppingCart className="w-12 h-12 text-[#7BA886]" />
        </div>
        <p className="text-gray-500 mb-2">Your cart is empty</p>
        <p className="text-sm text-gray-400">Start adding items to get started</p>
        
        {/* Decorative paw prints */}
        <div className="mt-8 flex gap-4 opacity-20">
          <span className="text-4xl">🐾</span>
          <span className="text-4xl">🐾</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-gray-400 py-8">
          <ShoppingCart className="w-12 h-12 text-[#7BA886] mb-3 opacity-50" />
          <p className="text-sm text-gray-500">Your cart is empty</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center justify-between text-sm px-1 py-2.5 border-b border-[#F0F0F0] last:border-b-0"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                
                <span className="text-gray-700 truncate">{item.product.name}</span>
              </div>
              
              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.product.id, -1)}
                    disabled={item.quantity <= 1}
                    className="min-h-11 min-w-11 rounded-full border border-[#7BA886] flex items-center justify-center hover:bg-[#7BA886] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
                    aria-label={`Decrease ${item.product.name} quantity`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="min-w-8 text-center font-semibold text-sm tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.product.id, 1)}
                    className="min-h-11 min-w-11 rounded-full border border-[#7BA886] bg-[#7BA886] text-white flex items-center justify-center hover:bg-[#5A8A6B] transition-colors touch-manipulation"
                    aria-label={`Increase ${item.product.name} quantity`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="text-right min-w-[60px]">
                  <span className="font-semibold text-gray-700">₱{(item.product.price * item.quantity).toFixed(2)}</span>
                </div>

                <div>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.product.id)}
                  className="min-h-11 min-w-11 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 touch-manipulation"
                  aria-label={`Remove ${item.product.name}`}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
