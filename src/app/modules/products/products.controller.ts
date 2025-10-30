import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { products, productSpecifications, productWarranty } from "../../../db/schema";

/**
 * ✅ Create Product
 */
export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      name,
      slug, // this is slud
      description,
      shortDescription,
      categoryId,
      originalPrice,
      discount,
      images,
      tags,
      specifications,
      warranty,
      vendorId,
      brandId,
    } = req.body;

    // ✅ Insert new product
    const [newProduct] = await db
      .insert(products)
      .values({
        name,
        slug,
        description,
        shortDescription,
        categoryId,
        originalPrice,
        discount,
        images,
        tags,
        vendorId,
        brandId,
      })
      .returning();

    // ✅ Insert specifications (if provided)
    if (Array.isArray(specifications) && specifications.length > 0) {
      await db.insert(productSpecifications).values(
        specifications.map((s: any) => ({
          productId: newProduct.productId,
          key: s.key,
          value: s.value,
        }))
      );
    }

    // ✅ Insert warranty (if provided)
    if (warranty && typeof warranty === "object") {
      await db.insert(productWarranty).values({
        productId: newProduct.productId,
        warrantyPeriod: warranty.warrantyPeriod || "",
        warrantyType: warranty.warrantyType || "",
        details: warranty.details || "",
      });
    }

    res.status(201).json({
      message: "✅ Product created successfully",
      product: newProduct,
    });
  } catch (err: any) {
    console.error("❌ Error creating product:", err);
    res.status(500).json({
      message: "Error creating product",
      error: err.message,
    });
  }
};

/**
 * ✅ Get All Products
 */
export const getProducts = async (req: Request, res: Response) => {
  try {
    const allProducts = await db.select().from(products);
    res.json(allProducts);
  } catch (err: any) {
    res.status(500).json({
      message: "Error fetching products",
      error: err.message,
    });
  }
};

/**
 * ✅ Get Single Product (with specs + warranty)
 */
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.productId, id));

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const specs = await db
      .select()
      .from(productSpecifications)
      .where(eq(productSpecifications.productId, product.productId));

    const [warranty] = await db
      .select()
      .from(productWarranty)
      .where(eq(productWarranty.productId, product.productId));

    res.json({
      ...product,
      specifications: specs,
      warranty: warranty || null,
    });
  } catch (err: any) {
    res.status(500).json({
      message: "Error fetching product",
      error: err.message,
    });
  }
};

/**
 * ✅ Update Product
 */
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    await db
      .update(products)
      .set({
        name: data.name,
        description: data.description,
        shortDescription: data.shortDescription,
        categoryId: data.categoryId,
        originalPrice: data.originalPrice,
        discount: data.discount,
        images: data.images,
        tags: data.tags,
        brandId: data.brandId,
        updatedAt: new Date(),
      })
      .where(eq(products.productId, id));

    res.json({ message: "✅ Product updated successfully" });
  } catch (err: any) {
    res.status(500).json({
      message: "Error updating product",
      error: err.message,
    });
  }
};

/**
 * ✅ Delete Product (with cascade delete for specs & warranty)
 */
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db
      .delete(productSpecifications)
      .where(eq(productSpecifications.productId, id));

    await db
      .delete(productWarranty)
      .where(eq(productWarranty.productId, id));

    await db.delete(products).where(eq(products.productId, id));

    res.json({ message: "🗑️ Product deleted successfully" });
  } catch (err: any) {
    res.status(500).json({
      message: "Error deleting product",
      error: err.message,
    });
  }
};