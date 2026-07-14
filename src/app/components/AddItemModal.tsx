import { useState, useEffect, type FormEvent } from 'react';
import { X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { addProduct, getLastProductCategory, fetchCategories } from '../services/productService';
import { toast } from 'sonner';
import { cn } from './ui/utils';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

const touchInputClass =
  'mt-2 min-h-12 rounded-2xl border-[#D4E8DA] bg-white text-base shadow-sm focus-visible:border-[#1E8C5A] focus-visible:ring-[#1E8C5A]/25 touch-manipulation';

const touchSelectTriggerClass =
  'mt-2 min-h-12 w-full rounded-2xl border-[#D4E8DA] bg-white text-base shadow-sm touch-manipulation';

const fieldLabelClass = 'text-sm font-semibold text-[#2C3E2E]';

export function AddItemModal({ isOpen, onClose, onProductAdded }: AddItemModalProps) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    price: '',
    cost: '',
    category: '',
    stock: '',
    minStockLevel: '5',
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoryData = await fetchCategories();
        setCategories(categoryData);

        const lastCategory = await getLastProductCategory();
        setFormData((prev) => ({ ...prev, category: lastCategory }));
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      price: '',
      cost: '',
      category: '',
      stock: '',
      minStockLevel: '5',
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.cost || !formData.category || !formData.stock) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const productData = {
        id: formData.id,
        name: formData.name,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost),
        category: formData.category,
        stock: parseInt(formData.stock, 10),
        minStockLevel: parseInt(formData.minStockLevel, 10),
      };

      await addProduct(productData);
      toast.success('Product added successfully!', {
        description: `${productData.name} has been added to inventory.`,
        icon: '✅',
      });

      resetForm();
      onProductAdded();
      onClose();
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) handleClose();
  };

  const handleAddStock = (amount: number) => {
    setFormData((prev) => ({
      ...prev,
      stock: (parseInt(prev.stock || '0', 10) + amount).toString(),
    }));
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'flex h-full w-full max-w-full flex-col gap-0 border-l border-[#D4E8DA] bg-[#F4F8F3] p-0',
          'sm:max-w-md md:max-w-lg lg:max-w-xl',
          '[&>button.absolute]:hidden',
        )}
      >
        <SheetHeader className="shrink-0 border-b border-[#D4E8DA] bg-[#1E8C5A] px-5 py-5 text-left text-white">
          <div className="flex items-start justify-between gap-4 pr-2">
            <div className="space-y-1">
              <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                <span className="text-2xl" aria-hidden>
                  ➕
                </span>
                Add New Item
              </SheetTitle>
              <SheetDescription className="text-sm text-white/85">
                Enter product details for inventory and POS.
              </SheetDescription>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="min-h-11 min-w-11 shrink-0 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition touch-manipulation"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div
            className="flex-1 overflow-y-auto overscroll-contain px-5 py-6 space-y-6 scroll-pb-40"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="space-y-2">
              <Label htmlFor="add-category" className={fieldLabelClass}>
                Category *
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger id="add-category" className={touchSelectTriggerClass}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-[#D4E8DA]">
                  {categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.name}
                      className="min-h-11 text-base rounded-xl"
                    >
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-name" className={fieldLabelClass}>
                Product Name *
              </Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Premium Dog Food"
                className={touchInputClass}
                required
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-price" className={fieldLabelClass}>
                Price (₱) *
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B6154] font-medium">
                  ₱
                </span>
                <Input
                  id="add-price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="89.99"
                  className={cn(touchInputClass, 'pl-10')}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-cost" className={fieldLabelClass}>
                Cost (₱) *
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B6154] font-medium">
                  ₱
                </span>
                <Input
                  id="add-cost"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cost: e.target.value }))}
                  placeholder="65.00"
                  className={cn(touchInputClass, 'pl-10')}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-stock" className={fieldLabelClass}>
                Initial Stock *
              </Label>
              <Input
                id="add-stock"
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))}
                placeholder="50"
                className={touchInputClass}
                required
              />
              <div className="pt-2 space-y-3">
                <p className="text-sm font-semibold text-[#4B6154]">Quick add stock</p>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 20].map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      className="min-h-11 flex-1 min-w-[4.5rem] rounded-2xl border-[#D4E8DA] bg-white text-[#1E8C5A] font-semibold hover:bg-[#E8F3EB] touch-manipulation"
                      onClick={() => handleAddStock(amount)}
                    >
                      +{amount}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2 pb-8">
              <Label htmlFor="add-min-stock" className={fieldLabelClass}>
                Minimum Stock Level
              </Label>
              <Input
                id="add-min-stock"
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.minStockLevel}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, minStockLevel: e.target.value }))
                }
                placeholder="5"
                className={touchInputClass}
              />
              <p className="text-sm text-[#4B6154] leading-relaxed">
                The product card shows a warning when stock falls below this level.
              </p>
            </div>
          </div>

          <div
            className="shrink-0 border-t border-[#D4E8DA] bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(30,140,90,0.08)]"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="min-h-12 flex-1 rounded-2xl border-[#D4E8DA] bg-[#F5F7F3] text-[#2C3E2E] font-semibold hover:bg-[#E8F3EB] touch-manipulation"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="min-h-12 flex-1 rounded-2xl bg-[#1E8C5A] text-white font-semibold hover:bg-[#166c44] touch-manipulation"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Product'}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
