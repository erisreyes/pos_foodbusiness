import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { AddItemModal } from '../components/AddItemModal';
import { UpdateItemModal } from '../components/UpdateItemModal';
import { Button } from '../components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { AppHeader } from '../components/AppHeader';
import { Toaster } from '../components/ui/sonner';
import { cn } from '../components/ui/utils';
import { deleteProduct, fetchProducts } from '../services/productService';
import { Product } from '../types/pos';
import { useAuth } from '../context/AuthContext';

const LOW_STOCK_THRESHOLD = 15;
const CRITICAL_STOCK_THRESHOLD = 5;

function StockCell({ stock }: { stock: number }) {
  if (stock > LOW_STOCK_THRESHOLD) {
    return <span>{stock}</span>;
  }

  const isCritical = stock <= CRITICAL_STOCK_THRESHOLD;

  return (
    <span
      className={cn(
        'inline-flex min-w-[2rem] items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        isCritical
          ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
          : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
      )}
      title={isCritical ? 'Critical — restock soon' : 'Low stock — consider restocking'}
    >
      {stock}
    </span>
  );
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
      setError(err?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleLogout = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      return (
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.barcode ? p.barcode.toLowerCase().includes(q) : false)
      );
    });
  }, [products, search]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, products.length]);

  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  }, [filteredProducts.length, pageSize]);

  const safePage = Math.min(page, pageCount);

  const pagedProducts = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filteredProducts.slice(start, end);
  }, [filteredProducts, pageSize, safePage]);

  const showingStart = filteredProducts.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const showingEnd = Math.min(safePage * pageSize, filteredProducts.length);

  const openEdit = (p: Product) => {
    setProductToEdit(p);
    setIsUpdateOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      toast.success('Deleted product', { description: productToDelete.name });
      setProductToDelete(null);
      await load();
    } catch (err: unknown) {
      console.error('Failed to delete product:', err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message ?? '')
          : '';
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code ?? '')
          : '';
      const isFkViolation =
        code === '23503' || message.toLowerCase().includes('foreign key constraint');

      if (isFkViolation) {
        toast.error('Unable to delete product', {
          description:
            'This product already exists in transaction history. To keep past receipts accurate, it cannot be deleted.',
        });
        return;
      }

      toast.error('Failed to delete product', {
        description: message || 'Unknown error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#F4F8F3]">
      <Toaster richColors />

      <AppHeader onLogout={handleLogout} />

      <div className="flex-1 overflow-hidden px-4 py-4">
        <div className="p-6 h-full bg-white rounded-[20px] shadow-sm overflow-hidden flex flex-col">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-2xl font-semibold text-[#1E3D2D]">Inventory Management</h2>

            <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SKU / name / category / barcode…"
                className="w-full sm:w-80 h-11 rounded-2xl border border-[#E6ECE7] px-4 text-sm shadow-sm"
              />
              <Button
                onClick={() => setIsAddOpen(true)}
                className="h-11 rounded-2xl bg-[#1E8C5A] text-white hover:bg-[#166c44]"
              >
                + Add
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-gray-500">Loading products...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F7F3] text-sm text-gray-600">
                    <th className="px-3 py-2 border">SKU</th>
                    <th className="px-3 py-2 border">Name</th>
                    <th className="px-3 py-2 border">Category</th>
                    <th className="px-3 py-2 border text-right">Cost</th>
                    <th className="px-3 py-2 border text-right">Price</th>
                    <th className="px-3 py-2 border text-right">Stock</th>
                    <th className="px-3 py-2 border">Barcode</th>
                    <th className="px-3 py-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedProducts.map((p) => (
                    <tr key={p.id} className="odd:bg-white even:bg-[#FBFDFB] hover:bg-[#F0F6F0]">
                      <td className="px-3 py-2 border text-sm text-gray-700">{p.id}</td>
                      <td className="px-3 py-2 border text-sm text-gray-700">{p.name}</td>
                      <td className="px-3 py-2 border text-sm text-gray-600">{p.category}</td>
                      <td className="px-3 py-2 border text-sm text-right text-gray-600">
                        ₱{Number(p.cost ?? 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 border text-sm text-right text-[#1E8C5A] font-medium">
                        ₱{Number(p.price).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 border text-sm text-right">
                        <StockCell stock={p.stock} />
                      </td>
                      <td className="px-3 py-2 border text-sm text-gray-600">{p.barcode || '-'}</td>
                      <td className="px-3 py-2 border">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            aria-label={`Edit ${p.name}`}
                            className={cn(
                              'flex min-h-10 min-w-10 items-center justify-center rounded-xl',
                              'bg-[#E7F7EE] text-[#1E8C5A] border border-[#C8E8D4]',
                              'hover:bg-[#D4F0E0] active:scale-95 transition touch-manipulation',
                            )}
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setProductToDelete(p)}
                            aria-label={`Delete ${p.name}`}
                            className={cn(
                              'flex min-h-10 min-w-10 items-center justify-center rounded-xl',
                              'bg-red-50 text-red-600 border border-red-200',
                              'hover:bg-red-100 active:scale-95 transition touch-manipulation',
                            )}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-3">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{showingStart}</span>–<span className="font-semibold">{showingEnd}</span>{' '}
                  of <span className="font-semibold">{filteredProducts.length}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600 mr-2 hidden sm:block">Rows:</div>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="h-9 rounded-xl border border-[#E6ECE7] px-3 text-sm shadow-sm bg-white"
                    aria-label="Rows per page"
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}/page
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    className="h-9 rounded-xl"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                  >
                    Prev
                  </Button>
                  <div className="text-sm text-gray-600">
                    Page <span className="font-semibold">{safePage}</span> / <span className="font-semibold">{pageCount}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="h-9 rounded-xl"
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={safePage >= pageCount}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddItemModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onProductAdded={load}
      />

      <UpdateItemModal
        isOpen={isUpdateOpen}
        onClose={() => {
          setIsUpdateOpen(false);
          setProductToEdit(null);
        }}
        product={productToEdit}
        userRole="admin"
        onProductUpdated={() => {
          load();
          setIsUpdateOpen(false);
          setProductToEdit(null);
        }}
      />

      <AlertDialog
        open={productToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setProductToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl border-[#E6ECE7] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1E3D2D]">Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              {productToDelete
                ? `You are about to permanently delete "${productToDelete.name}" (SKU: ${productToDelete.id}). This action cannot be undone. Products linked to past transactions cannot be deleted.`
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={isDeleting}
              className="min-h-11 rounded-xl touch-manipulation"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              className="min-h-11 rounded-xl touch-manipulation"
              onClick={() => void handleConfirmDelete()}
            >
              {isDeleting ? 'Deleting…' : 'Delete product'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
