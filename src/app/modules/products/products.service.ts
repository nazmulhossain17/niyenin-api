import { ProductData } from "./products.interface";

const validatePriceAndDiscount = (originalPrice: string, discount?: string) => {
  const price = parseFloat(originalPrice);
  const discountValue = discount ? parseFloat(discount) : 0;

  if (price <= 0) {
    throw new ValidationError("Original price must be greater than 0");
  }

  if (discountValue < 0 || discountValue > 100) {
    throw new ValidationError("Discount must be between 0 and 100");
  }
};

const checkSlugExists = async (slug: string, excludeProductId?: string) => {
  const conditions = [eq(products.slug, slug)];
  
  if (excludeProductId) {
    conditions.push(ne(products.productId, excludeProductId));
  }

  const [existingProduct] = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .limit(1);

  return !!existingProduct;
};

const verifyEntityExists = async (table: any, id: string, entityName: string) => {
  const [entity] = await db
    .select()
    .from(table)
    .where(eq(table[`${entityName.toLowerCase()}Id` as keyof typeof table], id))
    .limit(1);

  if (!entity) {
    throw new ValidationError(`${entityName} not found`);
  }
};

/**
 * Create a new product
 */
export const createProduct = async (data: ProductData): Promise<Product> => {
  validatePriceAndDiscount(data.originalPrice, data.discount);

  // Check if slug already exists
  const slugExists = await checkSlugExists(data.slug);
  if (slugExists) {
    throw new ValidationError("Product with this slug already exists");
  }

  // Verify vendor exists
  await verifyEntityExists(vendors, data.vendorId, 'Vendor');

  // Verify category exists
  await verifyEntityExists(categories, data.categoryId, 'Category');

  // Verify brand exists if provided
  if (data.brandId) {
    await verifyEntityExists(brands, data.brandId, 'Brand');
  }

  const [product] = await db
    .insert(products)
    .values({
      vendorId: data.vendorId,
      brandId: data.brandId,
      categoryId: data.categoryId,
      name: data.name,
      slug: data.slug,
      shortDescription: data.shortDescription,
      description: data.description,
      originalPrice: data.originalPrice,
      discount: data.discount || "0",
      images: data.images || [],
      tags: data.tags || [],
      isActive: data.isActive ?? true,
    })
    .returning();

  return product;
};

/**
 * Get product by ID
 */
export const getProductById = async (productId: string): Promise<Product | null> => {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.productId, productId))
    .limit(1);

  return product || null;
};

/**
 * Get product by slug
 */
export const getProductBySlug = async (slug: string): Promise<Product | null> => {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  return product || null;
};

/**
 * Get products with filtering and pagination
 */
export const getProducts = async (
  filters: ProductFilters = {},
  pagination: PaginationOptions = {}
): Promise<{ products: Product[]; total: number }> => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = pagination;

  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];

  if (filters.vendorId) {
    conditions.push(eq(products.vendorId, filters.vendorId));
  }

  if (filters.categoryId) {
    conditions.push(eq(products.categoryId, filters.categoryId));
  }

  if (filters.brandId) {
    conditions.push(eq(products.brandId, filters.brandId));
  }

  if (filters.search) {
    conditions.push(
      like(products.name, `%${filters.search}%`)
    );
  }

  if (filters.minPrice !== undefined) {
    conditions.push(
      sql`${products.originalPrice}::numeric >= ${filters.minPrice}`
    );
  }

  if (filters.maxPrice !== undefined) {
    conditions.push(
      sql`${products.originalPrice}::numeric <= ${filters.maxPrice}`
    );
  }

  if (filters.isActive !== undefined) {
    conditions.push(eq(products.isActive, filters.isActive));
  }

  if (filters.tags && filters.tags.length > 0) {
    conditions.push(
      sql`${products.tags} && ${filters.tags}`
    );
  }

  const whereClause = conditions.length > 0 
    ? and(...conditions)
    : undefined;

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(whereClause);

  const total = countResult[0]?.count || 0;

  // Build order by
  const orderByColumn = products[sortBy as keyof typeof products];
  const orderBy = sortOrder === 'desc' 
    ? desc(orderByColumn)
    : asc(orderByColumn);

  // Get products
  const productList = await db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return {
    products: productList,
    total
  };
};

/**
 * Update product
 */
export const updateProduct = async (
  productId: string, 
  vendorId: string, 
  data: UpdateProductData
): Promise<Product> => {
  // Verify product exists and belongs to vendor
  const [existingProduct] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.productId, productId),
        eq(products.vendorId, vendorId)
      )
    )
    .limit(1);

  if (!existingProduct) {
    throw new NotFoundError("Product not found or you don't have permission to update it");
  }

  // Check if new slug conflicts with other products
  if (data.slug && data.slug !== existingProduct.slug) {
    const slugExists = await checkSlugExists(data.slug, productId);
    if (slugExists) {
      throw new ValidationError("Product with this slug already exists");
    }
  }

  // Validate price and discount if provided
  if (data.originalPrice) {
    validatePriceAndDiscount(data.originalPrice, data.discount);
  } else if (data.discount !== undefined) {
    validatePriceAndDiscount(existingProduct.originalPrice, data.discount);
  }

  // Verify category exists if provided
  if (data.categoryId) {
    await verifyEntityExists(categories, data.categoryId, 'Category');
  }

  // Verify brand exists if provided
  if (data.brandId) {
    await verifyEntityExists(brands, data.brandId, 'Brand');
  }

  const [updatedProduct] = await db
    .update(products)
    .set({
      ...data,
      updatedAt: new Date().toISOString()
    })
    .where(eq(products.productId, productId))
    .returning();

  return updatedProduct;
};

/**
 * Delete product (soft delete by setting isActive to false)
 */
export const deleteProduct = async (productId: string, vendorId: string): Promise<void> => {
  const [existingProduct] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.productId, productId),
        eq(products.vendorId, vendorId)
      )
    )
    .limit(1);

  if (!existingProduct) {
    throw new NotFoundError("Product not found or you don't have permission to delete it");
  }

  await db
    .update(products)
    .set({ 
      isActive: false,
      updatedAt: new Date().toISOString()
    })
    .where(eq(products.productId, productId));
};

/**
 * Get products by vendor
 */
export const getProductsByVendor = async (
  vendorId: string, 
  pagination: PaginationOptions = {}
): Promise<{ products: Product[]; total: number }> => {
  return getProducts({ vendorId }, pagination);
};

/**
 * Calculate sale price
 */
export const calculateSalePrice = (originalPrice: string, discount: string): number => {
  const price = parseFloat(originalPrice);
  const discountPercent = parseFloat(discount);
  return price * (1 - discountPercent / 100);
};

/**
 * Toggle product active status
 */
export const toggleProductStatus = async (productId: string, vendorId: string): Promise<Product> => {
  const [existingProduct] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.productId, productId),
        eq(products.vendorId, vendorId)
      )
    )
    .limit(1);

  if (!existingProduct) {
    throw new NotFoundError("Product not found or you don't have permission to update it");
  }

  const [updatedProduct] = await db
    .update(products)
    .set({ 
      isActive: !existingProduct.isActive,
      updatedAt: new Date().toISOString()
    })
    .where(eq(products.productId, productId))
    .returning();

  return updatedProduct;
};

/**
 * Get related products (by category and brand)
 */
export const getRelatedProducts = async (
  productId: string, 
  limit: number = 4
): Promise<Product[]> => {
  const [currentProduct] = await db
    .select()
    .from(products)
    .where(eq(products.productId, productId))
    .limit(1);

  if (!currentProduct) {
    throw new NotFoundError("Product not found");
  }

  const relatedProducts = await db
    .select()
    .from(products)
    .where(
      and(
        ne(products.productId, productId),
        eq(products.isActive, true),
        and(
          eq(products.categoryId, currentProduct.categoryId),
          eq(products.brandId, currentProduct.brandId)
        )
      )
    )
    .limit(limit);

  return relatedProducts;
};

/**
 * Bulk update products (for vendor)
 */
export const bulkUpdateProducts = async (
  vendorId: string,
  productIds: string[],
  data: Partial<UpdateProductData>
): Promise<{ updatedCount: number }> => {
  if (data.originalPrice) {
    validatePriceAndDiscount(data.originalPrice, data.discount);
  }

  const result = await db
    .update(products)
    .set({
      ...data,
      updatedAt: new Date().toISOString()
    })
    .where(
      and(
        eq(products.vendorId, vendorId),
        sql`${products.productId} IN (${sql.raw(productIds.map(id => `'${id}'`).join(','))})`
      )
    );

  return { updatedCount: result.rowCount || 0 };
};

// Export all functions as named exports
export const productService = {
  createProduct,
  getProductById,
  getProductBySlug,
  getProducts,
  updateProduct,
  deleteProduct,
  getProductsByVendor,
  calculateSalePrice,
  toggleProductStatus,
  getRelatedProducts,
  bulkUpdateProducts,
};