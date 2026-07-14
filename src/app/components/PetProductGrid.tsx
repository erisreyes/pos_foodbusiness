import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Product } from '../types/pos';
import { Plus, Package, Edit2, GripVertical } from 'lucide-react';
import { cn } from './ui/utils';

interface PetProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onEditProduct?: (product: Product) => void;
  onReorder?: (products: Product[]) => void;
  quickAddItems?: string[];
}

type SortableProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
  onEditProduct?: (product: Product) => void;
  isQuickAdd: boolean;
  isLowStock: boolean;
};

function SortableProductCard({
  product,
  onAddToCart,
  onEditProduct,
  isQuickAdd,
  isLowStock,
}: SortableProductCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative min-h-[150px] lg:min-h-[160px]',
        isDragging && 'z-50 opacity-95',
      )}
    >
      <div
        className={cn(
          'group flex h-full flex-col rounded-2xl border bg-white p-3 text-left shadow-sm transition-all overflow-hidden',
          isLowStock
            ? 'border-red-300 ring-1 ring-red-200'
            : isQuickAdd
              ? 'border-[#7BA886] ring-1 ring-[#7BA886]/20'
              : 'border-[#E8DFD0] hover:border-[#7BA886] hover:shadow-lg',
          isDragging && 'shadow-xl ring-2 ring-[#1E8C5A]/30',
        )}
      >
        <button
          type="button"
          aria-label={`Drag to reorder ${product.name}`}
          className={cn(
            'absolute top-2 right-2 z-10 flex min-h-10 min-w-10 items-center justify-center rounded-xl',
            'border border-[#D4E8DA] bg-[#F0F6F2] text-[#4B6154]',
            'touch-manipulation active:scale-95 cursor-grab active:cursor-grabbing',
          )}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {onEditProduct && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditProduct(product);
            }}
            className="absolute top-2 left-2 z-10 flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-[#E6ECE7] bg-white text-[#4B6154] hover:bg-[#F2F6F2] touch-manipulation"
            aria-label={`Edit ${product.name}`}
          >
            <Edit2 className="h-4 w-4" />
          </button>
        )}

        {isLowStock && (
          <div className="absolute top-12 right-2 z-[1] rounded-full bg-red-500 px-2 py-1 text-[11px] text-white">
            Low Stock
          </div>
        )}
        {isQuickAdd && !isLowStock && (
          <div className="absolute top-12 right-2 z-[1] rounded-full bg-[#7BA886] px-2 py-1 text-[11px] text-white">
            Popular
          </div>
        )}

        <button
          type="button"
          onClick={() => onAddToCart(product)}
          className="flex min-h-0 flex-1 flex-col w-full touch-manipulation active:scale-[0.98] text-left pt-1"
        >
          <div
            className={cn(
              'mb-2 flex h-10 w-10 items-center justify-center rounded-xl',
              isLowStock ? 'bg-red-50' : 'bg-[#F5F1E8]',
            )}
          >
            <Package className={cn('h-5 w-5', isLowStock ? 'text-red-500' : 'text-[#7BA886]')} />
          </div>

          <div className="flex-1">
            <h3
              className={cn(
                'mb-1 line-clamp-2 text-sm font-semibold',
                isLowStock ? 'text-red-700' : 'text-[#2C3E2E]',
              )}
            >
              {product.name}
            </h3>
            <div className="mb-2 flex items-center justify-between gap-2 text-[13px] text-gray-600">
              <span className={cn('font-semibold', isLowStock ? 'text-red-600' : 'text-[#2C3E2E]')}>
                ₱{product.price.toFixed(2)}
              </span>
              <span className={cn('text-xs', isLowStock ? 'font-medium text-red-500' : 'text-gray-500')}>
                ({product.stock})
              </span>
            </div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500">{product.category}</p>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <div
              className={cn(
                'rounded-full px-2 py-1 text-xs font-semibold text-white shadow-sm',
                isLowStock ? 'bg-red-500' : 'bg-[#7BA886] group-hover:bg-[#5A8A6B]',
              )}
            >
              <span className="inline-flex items-center gap-1">
                <Plus className="h-3 w-3" />
                Add
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

export function PetProductGrid({
  products,
  onAddToCart,
  onEditProduct,
  onReorder,
  quickAddItems = [],
}: PetProductGridProps) {
  const productIds = useMemo(() => products.map((p) => p.id), [products]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(products, oldIndex, newIndex));
  };

  const grid = (
    <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 lg:grid-cols-3 lg:gap-3 lg:p-3 xl:grid-cols-4">
      {products.map((product) => (
        <SortableProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          onEditProduct={onEditProduct}
          isQuickAdd={quickAddItems.includes(product.id)}
          isLowStock={product.stock <= (product.minStockLevel || 5)}
        />
      ))}
    </div>
  );

  if (!onReorder) {
    return grid;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={productIds} strategy={rectSortingStrategy}>
        {grid}
      </SortableContext>
    </DndContext>
  );
}
