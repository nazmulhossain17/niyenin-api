import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { brands } from "../../../db/schema";

/**
 * ✅ Create Brand
 */
export const createBrand = async (req: Request, res: Response) => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ message: "Name and slug are required." });
    }

    const [existing] = await db
      .select()
      .from(brands)
      .where(eq(brands.slug, slug));

    if (existing) {
      return res.status(409).json({ message: "Slug already exists." });
    }

    const [newBrand] = await db.insert(brands).values({ name, slug }).returning();

    res.status(201).json({ message: "✅ Brand created successfully", brand: newBrand });
  } catch (err: any) {
    console.error("❌ Error creating brand:", err);
    res.status(500).json({ message: "Error creating brand", error: err.message });
  }
};

/**
 * ✅ Get All Brands
 */
export const getBrands = async (_req: Request, res: Response) => {
  try {
    const allBrands = await db.select().from(brands);
    res.json(allBrands);
  } catch (err: any) {
    res.status(500).json({ message: "Error fetching brands", error: err.message });
  }
};

/**
 * ✅ Get Single Brand
 */
export const getBrandById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [brand] = await db.select().from(brands).where(eq(brands.brandId, id));

    if (!brand) return res.status(404).json({ message: "Brand not found" });

    res.json(brand);
  } catch (err: any) {
    res.status(500).json({ message: "Error fetching brand", error: err.message });
  }
};

/**
 * ✅ Update Brand
 */
export const updateBrand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug } = req.body;

    await db
      .update(brands)
      .set({ name, slug, updatedAt: new Date() })
      .where(eq(brands.brandId, id));

    res.json({ message: "✅ Brand updated successfully" });
  } catch (err: any) {
    res.status(500).json({ message: "Error updating brand", error: err.message });
  }
};

/**
 * ✅ Delete Brand
 */
export const deleteBrand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.delete(brands).where(eq(brands.brandId, id));

    res.json({ message: "🗑️ Brand deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ message: "Error deleting brand", error: err.message });
  }
};