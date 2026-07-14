# Supabase Integration Guide

## Setup

Your project is now Supabase-ready! Follow these steps:

### 1. Create a Supabase Account
- Go to https://supabase.com and sign up
- Create a new project

### 2. Configure Environment Variables
Update your `.env.local` file with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Create Database Tables

**Option A: Using the SQL file (Recommended)**
1. Go to your Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase-setup.sql` from the project root
4. Paste it into the SQL editor
5. Click **Run**

This will create:
- `categories` table (with all product categories)
- `products` table (with all 48 products)
- A view `products_with_categories` for easier querying
- Row Level Security policies for public read access

**Option B: Manual Setup**
Run this SQL for the `members` table:

```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  pet_name TEXT,
  pet_birthday DATE,
  loyalty_points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_members_user_id ON members(user_id);
```

This section documents the authentication setup process for a Supabase project.

It outlines the steps required to:
1. Enable email-based authentication in the Supabase dashboard under the Authentication providers section
2. Configure any necessary sign-up validation rules or policies

This is typically part of a Mobile POS (Point of Sale) application setup guide to ensure users can create accounts and log in securely.
### 4. Set Authentication
- Enable Email auth in Authentication > Providers
- Set up sign-up rules as needed

## Usage

### Authentication
The login component now supports:
- **Phone Login**: Quick lookup with mock data
- **Email/Password**: Supabase authentication

### Using Products from Supabase

Import the product service in your components:

```tsx
import { fetchProducts, fetchProductsByCategory, searchProducts } from '../../services/productService';

// In a component
const [products, setProducts] = useState<Product[]>([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  loadProducts();
}, []);

// Search products
const handleSearch = async (query: string) => {
  const results = await searchProducts(query);
  setProducts(results);
};

// Load products by category
const handleCategoryChange = async (category: string) => {
  const data = await fetchProductsByCategory(category);
  setProducts(data);
};

// Update stock after checkout
const handleCheckout = async (items: CartItem[]) => {
  const updates = items.map(item => ({
    id: item.id,
    stock: item.stock - item.quantity
  }));
  await updateMultipleProducts(updates);
};
```

### Product Service Functions

Available functions in `src/app/services/productService.ts`:

- `fetchProducts()` - Get all products
- `fetchProductsByCategory(category)` - Get products by category
- `fetchCategories()` - Get all categories
- `fetchProductById(id)` - Get single product
- `updateProductStock(id, newStock)` - Update stock after sale
- `searchProducts(query)` - Search by name or category
- `getLowStockItems(threshold)` - Get inventory alerts
- `updateMultipleProducts(updates)` - Batch update stocks

### Using Supabase Client

```tsx
import { supabase } from '../../lib/supabase';

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password'
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Get current user
const { data } = await supabase.auth.getUser();

// Sign out
await supabase.auth.signOut();

// Fetch data
const { data: members } = await supabase
  .from('members')
  .select('*');

// Insert data
const { data, error } = await supabase
  .from('members')
  .insert([{ name: 'John', phone: '123456' }]);

// Update data
const { error } = await supabase
  .from('members')
  .update({ loyalty_points: 500 })
  .eq('id', 'member-id');
```

## Key Files

-- `src/lib/supabase.ts` - Supabase client initialization
-- `.env.local` - Environment variables (never commit to git)
-- `src/app/components/UserLogin.tsx` - Updated with Supabase auth

## Security Notes

- Keep your `VITE_SUPABASE_ANON_KEY` in `.env.local` (don't commit)
- Use Row Level Security (RLS) policies in Supabase for data protection
- The ANON_KEY is safe to expose; it's designed for client-side use with RLS

## Next Steps

1. Replace mock product data with Supabase queries
2. Set up Supabase Realtime for live updates
3. Implement membership features using authenticated sessions
4. Add RLS policies for data protection

## Hard delete products (keep transaction history)

If you want to **hard-delete rows from `products`** even when they appear in past sales, you must remove the foreign key:
`transaction_items.product_id → products.id`.

Run this in Supabase **SQL Editor**:

```sql
BEGIN;

ALTER TABLE public.transaction_items
  DROP CONSTRAINT IF EXISTS transaction_items_product_id_fkey;

CREATE INDEX IF NOT EXISTS idx_transaction_items_product_id
  ON public.transaction_items(product_id);

COMMIT;
```

This keeps old `transaction_items` rows (with `product_name`, `unit_price`, etc.) intact while allowing products to be deleted from the catalog.

## Offline POS sync (required for offline sales upload)

Before using offline checkout sync on iPad, run `supabase-offline-migration.sql` in the SQL Editor. This adds:

- `transactions.client_sale_id` (UUID, unique) — idempotent replay of offline sales
- `transactions.source` — `pos_online` | `pos_offline`

Ensure authenticated staff can `INSERT` on `transactions` and `transaction_items`, and `EXECUTE` the `decrement_stock` RPC.

**Client modules:** `src/app/offline/` (Dexie IndexedDB), `src/app/services/checkoutService.ts`, `src/app/offline/syncEngine.ts`, `src/app/context/ConnectivityContext.tsx`.
