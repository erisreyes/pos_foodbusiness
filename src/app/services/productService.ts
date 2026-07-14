// src/app/services/productService.ts
import { supabase } from '../../lib/supabase';
import { Product } from '../types/pos';

/** Stable sort for POS grid: name (case-insensitive), then id. */
export function sortProductsStable(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const nameCmp = (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    if (nameCmp !== 0) return nameCmp;
    return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  });
}

/**
 * Fetch all products from Supabase
 */
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products_with_categories')
    .select('id, barcode,name, price, cost, category, category_id, stock, min_stock_level') // Added category_id and barcode
    .order('name', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
    throw error;
  }

  return sortProductsStable(
    data.map(item => ({
    ...item,
    cost: item.cost,
    barcode: item.barcode,
    category_id: item.category_id, // Ensure category_id is mapped
    minStockLevel: item.min_stock_level || 0 // Default to 0 if undefined
  })) as Product[],
  );
}

/**
 * Fetch products by category
 */
export async function fetchProductsByCategory(category: string): Promise<Product[]> {
  if (category === 'All Products') {
    return fetchProducts();
  }

  const { data, error } = await supabase
    .from('products_with_categories')
    .select('id, barcode, name, price, cost, category, category_id, stock, min_stock_level')
    .eq('category', category)
    .order('name', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching products by category:', error);
    throw error;
  }

  return sortProductsStable(
    data.map(item => ({
    ...item,
    cost: item.cost,
    barcode: item.barcode,
    category_id: item.category_id,
    minStockLevel: item.min_stock_level ?? 0
  })) as Product[],
  );
}

/**
 * Fetch all categories
 */
export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('id');

  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }

  return data;
}

/**
 * Get a single product by ID
 */
export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products_with_categories')
    .select('id, barcode, name, price, cost, category, category_id, stock, min_stock_level')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[fetchProductById] Error fetching product:', error);
    return null;
  }

  console.debug('[fetchProductById] Raw Supabase response:', {
    data,
    dataType: typeof data,
    productId: id
  });

  if (!data) {
    console.warn('[fetchProductById] No product found for ID:', id);
    return null;
  }

  return {
    ...data,
    cost: data.cost,
    barcode: data.barcode,
    category_id: data.category_id,
    minStockLevel: data.min_stock_level ?? 0
  } as Product;
}

/**
 * Update product stock (after purchase)
 */
export async function updateProductStock(id: string, newStock: number) {
  const { error } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', id);

  if (error) {
    console.error('Error updating stock:', error);
    throw error;
  }
}

/**
 * Search products by name or category
 */
export async function searchProducts(query: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products_with_categories')
    .select('id, barcode, name, price, cost, category, category_id, stock, min_stock_level')
    .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
    .order('name', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error('Error searching products:', error);
    throw error;
  }

  return sortProductsStable(
    data.map(item => ({
    ...item,
    cost: item.cost,
    barcode: item.barcode,
    category_id: item.category_id,
    minStockLevel: item.min_stock_level ?? 0
  })) as Product[],
  );
}

/**
 * Get low stock items (for inventory management)
 */
export async function getLowStockItems(threshold: number = 20): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products_with_categories')
    .select('id, barcode, name, price, cost, category, category_id, stock, min_stock_level')
    .lt('stock', threshold)
    .order('stock', { ascending: true })
    .order('name', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching low stock items:', error);
    throw error;
  }

  return data.map(item => ({
    ...item,
    cost: item.cost,
    barcode: item.barcode,
    category_id: item.category_id,
    minStockLevel: item.min_stock_level ?? 0
  })) as Product[];
}

/**
 * Add a new product to the database
 */
export async function addProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'barcode'>) {
  // Define category prefixes
  const categoryPrefixes: Record<string, string> = {
    'accessories': '10',
    'cat-food': '20',
    'cat-toys': '30',
    'dog-food': '40', // Added prefix for Dog Food
    'grooming': '50',
    'pharmacy': '60'
  };

  // First, get the category ID and prefix from the category name
  const { data: categoryData, error: categoryError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('name', product.category)
    .single();

  if (categoryError || !categoryData) {
    console.error('Category lookup error:', categoryError);
    throw new Error(`Category "${product.category}" not found`);
  }

  // Generate the product ID dynamically based on the category prefix and last ID
  const prefix = categoryPrefixes[categoryData.id.toLowerCase()];
  if (!prefix) {
    throw new Error(`No prefix defined for category "${categoryData.name}"`);
  }

  // Fetch the last product ID for the category
  const { data: lastProduct, error: lastProductError } = await supabase
    .from('products')
    .select('id')
    .ilike('id', `${prefix}%`)
    .order('id', { ascending: false })
    .limit(1)
    .single();

  if (lastProductError && lastProductError.code !== 'PGRST116') { // Ignore "no rows found" error
    console.error('Error fetching last product ID:', lastProductError);
    throw new Error('Failed to fetch last product ID');
  }

  let newIdNumber = 1; // Default to 1 if no previous ID exists
  if (lastProduct?.id) {
    const lastIdNumber = parseInt(lastProduct.id.replace(prefix, ''));
    if (!isNaN(lastIdNumber)) {
      newIdNumber = lastIdNumber + 1;
    }
  }

  const uniqueId = newIdNumber.toString().padStart(7, '0'); // Ensure unique ID is zero-padded to 7 digits
  const checkDigit = (prefix + uniqueId).split('').reduce((sum, digit, index) => {
    const num = parseInt(digit);
    return sum + (index % 2 === 0 ? num * 3 : num);
  }, 0) % 10;

  const barcode = `${prefix}${uniqueId}${checkDigit}`; // Combine prefix, unique ID, and check digit

  const productId = `${prefix}${newIdNumber.toString().padStart(4, '0')}`; // Ensure ID is zero-padded to 4 digits

  const { data, error } = await supabase
    .from('products')
    .insert([{
      id: productId,
      name: product.name,
      price: product.price,
      cost: product.cost,
      category_id: categoryData.id,
      stock: product.stock,
      min_stock_level: product.minStockLevel || 5,
      barcode: barcode
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding product:', error);
    throw new Error(error.message || 'Failed to insert product');
  }

  return data;
}

/**
 * Get the last added product's category for auto-categorization
 */
export async function getLastProductCategory(): Promise<string> {
  const { data, error } = await supabase
    .from('products_with_categories')
    .select('category')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error getting last category:', error);
    return 'Dog Food'; // Default fallback
  }

  return data?.category || 'Dog Food';
}

/**
 * Update an existing product in the database
 */
export async function updateProduct(product: Partial<Product> & { id: string; barcode?: string }) {
  // Validate that the product ID is provided
  if (!product.id) {
    throw new Error('Product ID is required for updating an item');
  }

  console.debug('[updateProduct] Received update request:', {
    productId: product.id,
    providedFields: {
      name: product.name,
      price: product.price,
      category_id: product.category_id,
      category: product.category,
      stock: product.stock,
      minStockLevel: product.minStockLevel,
      barcode: product.barcode
    }
  });

  // Fetch the existing product to ensure it exists
  const { data: existingProduct, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .eq('id', product.id)
    .maybeSingle();

  if (fetchError || !existingProduct) {
    console.error('Error fetching product for update:', fetchError);
    throw new Error(`Product with ID "${product.id}" not found`);
  }

  // Map either category_id or category name to the actual category_id
  let categoryId = existingProduct.category_id;
  
  if (product.category_id) {
    // Check if category_id looks like a valid UUID (has hyphens or is numeric)
    // Or if it's all lowercase letters, treat it as a category name and look it up
    const isValidUUID = /^[0-9a-f-]{36}$|^[0-9]+$/.test(product.category_id);
    
    if (isValidUUID) {
      categoryId = product.category_id;
      console.debug('[updateProduct] Using provided category_id (valid UUID):', categoryId);
    } else {
      // Treat as category name and look it up
      console.debug('[updateProduct] category_id looks like a name, resolving:', product.category_id);
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', product.category_id)
        .maybeSingle();

      console.log('[updateProduct] Category lookup result for', product.category_id, ':', { categoryData, categoryError });

      if (categoryError) {
        console.error('Category lookup error:', categoryError);
        throw new Error(`Failed to look up category: ${product.category_id}`);
      }
      
      if (!categoryData) {
        console.error('Category not found:', product.category_id);
        throw new Error(`Category "${product.category_id}" not found in database`);
      }

      categoryId = categoryData.id;
      console.debug('[updateProduct] Resolved category name to UUID:', { categoryName: product.category_id, categoryId });
    }
  } else if (product.category) {
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', product.category)
      .single();

    if (categoryError || !categoryData) {
      console.error('Category lookup error:', categoryError);
      throw new Error(`Category "${product.category}" not found`);
    }

    categoryId = categoryData.id;
    console.debug('[updateProduct] Resolved category name to UUID:', { categoryName: product.category, categoryId });
  } else {
    console.debug('[updateProduct] Using existing category_id:', categoryId);
  }

  if (!categoryId) {
    throw new Error('No valid category_id found for update');
  }

  // Update the product with the provided fields - only set values that are explicitly provided
  const updatePayload: any = {
    category_id: categoryId
  };

  // Only update fields that are provided and not undefined/null
  if (product.name !== undefined && product.name !== null) updatePayload.name = product.name;
  if (product.price !== undefined && product.price !== null) updatePayload.price = product.price;
  if (product.cost !== undefined && product.cost !== null) updatePayload.cost = product.cost;
  if (product.stock !== undefined && product.stock !== null) updatePayload.stock = product.stock;
  if (product.minStockLevel !== undefined && product.minStockLevel !== null) updatePayload.min_stock_level = product.minStockLevel;
  if (product.barcode !== undefined && product.barcode !== null) {
    const trimmed = product.barcode.trim();
    const existingBarcode = (existingProduct.barcode ?? '').trim();
    if (trimmed !== '' && trimmed !== existingBarcode) {
      updatePayload.barcode = trimmed;
    }
  }

  console.debug('[updateProduct] Update payload:', updatePayload);

  const { error } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', product.id);

  if (error) {
    console.error('Error updating product:', error);
    throw new Error(error.message || 'Failed to update product');
  }

  console.debug('[updateProduct] Update query executed successfully for ID:', product.id);

  // Refetch the updated product after successful update
  const { data: updatedProduct, error: refetchError } = await supabase
    .from('products')
    .select('*')
    .eq('id', product.id)
    .maybeSingle();

  if (refetchError) {
    console.error('[updateProduct] Error refetching updated product:', refetchError);
    throw new Error('Product updated but failed to retrieve updated data');
  }

  console.debug('[updateProduct] Refetched product data:', {
    productId: product.id,
    retrievedData: updatedProduct,
    hasName: updatedProduct?.name,
    hasPrice: updatedProduct?.price,
    hasStock: updatedProduct?.stock
  });

  return updatedProduct;
}

/**
 * Delete a product from the database
 */
export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}
