import { Request, Response } from "express";
import { db } from "../../db";
import {
  products,
  productSpecifications,
  productWarranty,
} from "../../db/schema";
import { eq } from "drizzle-orm";

export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      name,
      slug,
      description,
      categoryId,
      originalPrice,
      discount,
      images,
      tags,
      sizes,
      specifications,
      warranty,
      vendorId,
    } = req.body;

    const [newProduct] = await db
      .insert(products)
      .values({
        name,
        slug,
        description,
        categoryId,
        originalPrice,
        discount,
        images,
        tags,
        vendorId,
        sizes,
      })
      .returning();

    if (specifications && specifications.length > 0) {
      await db.insert(productSpecifications).values(
        specifications.map((s: any) => ({
          productId: newProduct.id,
          section: s.section,
          key: s.key,
          value: s.value,
        }))
      );
    }

    if (warranty) {
      await db.insert(productWarranty).values({
        productId: newProduct.id,
        details: warranty,
        warrantyPeriod: warranty.warrantyPeriod,
      });
    }

    res.status(201).json({
      message: "✅ Product created successfully",
      product: newProduct,
    });
  } catch (err: any) {
    console.error("❌ Error creating product:", err);
    res
      .status(500)
      .json({ message: "Error creating product", error: err.message });
  }
};

// ✅ Get all products
export const getProducts = async (req: Request, res: Response) => {
  try {
    const allProducts = await db.select().from(products);
    res.json(allProducts);
  } catch (err: any) {
    res
      .status(500)
      .json({ message: "Error fetching products", error: err.message });
  }
};

// ✅ Get single product with specs + warranty
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, Number(id)));

    if (!product) return res.status(404).json({ message: "Product not found" });

    const specs = await db
      .select()
      .from(productSpecifications)
      .where(eq(productSpecifications.productId, product.id));

    const warranty = await db
      .select()
      .from(productWarranty)
      .where(eq(productWarranty.productId, product.id));

    res.json({
      ...product,
      specifications: specs,
      warranty: warranty[0] || null,
    });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: "Error fetching product", error: err.message });
  }
};

// ✅ Update product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    await db
      .update(products)
      .set(data)
      .where(eq(products.id, Number(id)));

    res.json({ message: "Product updated" });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: "Error updating product", error: err.message });
  }
};

// ✅ Delete product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db
      .delete(productSpecifications)
      .where(eq(productSpecifications.productId, Number(id)));
    await db
      .delete(productWarranty)
      .where(eq(productWarranty.productId, Number(id)));
    await db.delete(products).where(eq(products.id, Number(id)));

    res.json({ message: "Product deleted" });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: "Error deleting product", error: err.message });
  }
};
