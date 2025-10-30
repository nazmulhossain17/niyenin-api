import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { categories } from "../../../db/schema";


/**
 * ✅ Create Category
 */
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, slug, description, parentId } = req.body;

    if (!name || !slug) {
      return res
        .status(400)
        .json({ message: "Name and slug are required." });
    }

    // Check if slug already exists
    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug));

    if (existing) {
      return res.status(409).json({ message: "Slug already exists." });
    }

    // Insert new category
    const [newCategory] = await db
      .insert(categories)
      .values({
        name,
        slug,
        parentId: parentId,
      })
      .returning();

    res.status(201).json({
      message: "✅ Category created successfully",
      category: newCategory,
    });
  } catch (err: any) {
    console.error("❌ Error creating category:", err);
    res.status(500).json({
      message: "Error creating category",
      error: err.message,
    });
  }
};

/**
 * ✅ Get All Categories
 */
export const getCategories = async (req: Request, res: Response) => {
  try {
    const allCategories = await db.select().from(categories);
    res.json(allCategories);
  } catch (err: any) {
    res.status(500).json({
      message: "Error fetching categories",
      error: err.message,
    });
  }
};

/**
 * ✅ Get Single Category
 */
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.categoryId, id));

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
  } catch (err: any) {
    res.status(500).json({
      message: "Error fetching category",
      error: err.message,
    });
  }
};

/**
 * ✅ Update Category
 */
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, parentId } = req.body;

    await db
      .update(categories)
      .set({
        name,
        slug,
        parentId: parentId || null,
        updatedAt: new Date(),
      })
      .where(eq(categories.categoryId, id));

    res.json({ message: "✅ Category updated successfully" });
  } catch (err: any) {
    res.status(500).json({
      message: "Error updating category",
      error: err.message,
    });
  }
};

/**
 * ✅ Delete Category
 */
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.delete(categories).where(eq(categories.categoryId, id));

    res.json({ message: "🗑️ Category deleted successfully" });
  } catch (err: any) {
    res.status(500).json({
      message: "Error deleting category",
      error: err.message,
    });
  }
};