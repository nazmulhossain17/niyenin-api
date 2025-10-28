import type { Request, Response } from "express";
import { eq, count, ilike, isNull } from "drizzle-orm";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.validation";
import { db } from "../../db";
import { categories } from "../../db/schema";

export class CategoryController {
  // Create category
  static async createCategory(req: Request, res: Response) {
    try {
      const { name, slug, parentId }: CreateCategoryInput = req.body;

      // Check if category with same slug exists
      const existingCategory = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1);

      if (existingCategory.length > 0) {
        return res
          .status(409)
          .json({ error: "Category with this slug already exists" });
      }

      // If parentId is provided, check if parent category exists
      if (parentId) {
        const parentCategory = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.id, parentId))
          .limit(1);

        if (!parentCategory.length) {
          return res.status(404).json({ error: "Parent category not found" });
        }
      }

      const newCategory = await db
        .insert(categories)
        .values({
          name,
          slug,
          parentId: parentId || null,
        })
        .returning({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          parentId: categories.parentId,
          createdAt: categories.createdAt,
        });

      return res.status(201).json({
        success: true,
        data: newCategory[0],
        message: "Category created successfully",
      });
    } catch (error) {
      console.error("Create category error:", error);
      return res.status(500).json({ error: "Failed to create category" });
    }
  }

  // Get all categories
  static async getAllCategories(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const search = req.query.search as string;
      const parentOnly = req.query.parentOnly === "true";
      const offset = (page - 1) * limit;

      let query = db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          parentId: categories.parentId,
          createdAt: categories.createdAt,
        })
        .from(categories);

      // Add filters
      const conditions = [];
      if (search) {
        conditions.push(ilike(categories.name, `%${search}%`));
      }
      if (parentOnly) {
        conditions.push(isNull(categories.parentId));
      }

      if (conditions.length > 0) {
        query = query.where(
          conditions.length === 1
            ? conditions[0]
            : conditions.reduce((acc, condition) => acc && condition)
        );
      }

      // Get total count
      let countQuery = db.select({ count: count() }).from(categories);
      if (conditions.length > 0) {
        countQuery = countQuery.where(
          conditions.length === 1
            ? conditions[0]
            : conditions.reduce((acc, condition) => acc && condition)
        );
      }
      const totalResult = await countQuery;
      const total = totalResult[0].count;

      // Get categories
      const categoriesList = await query
        .limit(limit)
        .offset(offset)
        .orderBy(categories.name);

      return res.status(200).json({
        success: true,
        data: categoriesList,
        message: "Categories retrieved successfully",
      });
    } catch (error) {
      console.error("Get all categories error:", error);
      return res.status(500).json({ error: "Failed to retrieve categories" });
    }
  }

  // Get category tree (hierarchical structure)
  static async getCategoryTree(req: Request, res: Response) {
    try {
      // Get all categories
      const allCategories = await db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          parentId: categories.parentId,
          createdAt: categories.createdAt,
        })
        .from(categories)
        .orderBy(categories.name);

      // Build tree structure
      const categoryMap = new Map();
      const rootCategories: any[] = [];

      // First pass: create map of all categories
      allCategories.forEach((category) => {
        categoryMap.set(category.id, { ...category, children: [] });
      });

      // Second pass: build tree structure
      allCategories.forEach((category) => {
        const categoryWithChildren = categoryMap.get(category.id);
        if (category.parentId) {
          const parent = categoryMap.get(category.parentId);
          if (parent) {
            parent.children.push(categoryWithChildren);
          }
        } else {
          rootCategories.push(categoryWithChildren);
        }
      });

      return sendSuccess(
        res,
        rootCategories,
        "Category tree retrieved successfully"
      );
    } catch (error) {
      console.error("Get category tree error:", error);
      return sendError(res, "Failed to retrieve category tree", 500);
    }
  }

  // Get category by ID
  static async getCategoryById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const category = await db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          parentId: categories.parentId,
          createdAt: categories.createdAt,
        })
        .from(categories)
        .where(eq(categories.id, Number(id)))
        .limit(1);

      if (!category.length) {
        return sendError(res, "Category not found", 404);
      }

      return sendSuccess(res, category[0], "Category retrieved successfully");
    } catch (error) {
      console.error("Get category by ID error:", error);
      return sendError(res, "Failed to retrieve category", 500);
    }
  }

  // Get category by slug
  static async getCategoryBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;

      const category = await db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          parentId: categories.parentId,
          createdAt: categories.createdAt,
        })
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1);

      if (!category.length) {
        return sendError(res, "Category not found", 404);
      }

      return sendSuccess(res, category[0], "Category retrieved successfully");
    } catch (error) {
      console.error("Get category by slug error:", error);
      return sendError(res, "Failed to retrieve category", 500);
    }
  }

  // Get subcategories of a category
  static async getSubcategories(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const subcategories = await db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          parentId: categories.parentId,
          createdAt: categories.createdAt,
        })
        .from(categories)
        .where(eq(categories.parentId, Number(id)))
        .orderBy(categories.name);

      return sendSuccess(
        res,
        subcategories,
        "Subcategories retrieved successfully"
      );
    } catch (error) {
      console.error("Get subcategories error:", error);
      return sendError(res, "Failed to retrieve subcategories", 500);
    }
  }

  // Update category
  static async updateCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: UpdateCategoryInput = req.body;

      // Check if slug is being updated and if it already exists
      if (updateData.slug) {
        const existingCategory = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.slug, updateData.slug))
          .limit(1);

        if (
          existingCategory.length > 0 &&
          existingCategory[0].id !== Number(id)
        ) {
          return sendError(res, "Category with this slug already exists", 409);
        }
      }

      // If parentId is being updated, check if parent exists and prevent circular reference
      if (updateData.parentId !== undefined) {
        if (updateData.parentId === Number(id)) {
          return sendError(res, "Category cannot be its own parent", 400);
        }

        if (updateData.parentId) {
          const parentCategory = await db
            .select({ id: categories.id })
            .from(categories)
            .where(eq(categories.id, updateData.parentId))
            .limit(1);

          if (!parentCategory.length) {
            return sendError(res, "Parent category not found", 404);
          }
        }
      }

      const updatedCategory = await db
        .update(categories)
        .set(updateData)
        .where(eq(categories.id, Number(id)))
        .returning({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          parentId: categories.parentId,
          createdAt: categories.createdAt,
        });

      if (!updatedCategory.length) {
        return sendError(res, "Category not found", 404);
      }

      return sendSuccess(
        res,
        updatedCategory[0],
        "Category updated successfully"
      );
    } catch (error) {
      console.error("Update category error:", error);
      return sendError(res, "Failed to update category", 500);
    }
  }

  // Delete category
  static async deleteCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if category has subcategories
      const subcategories = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.parentId, Number(id)))
        .limit(1);

      if (subcategories.length > 0) {
        return sendError(res, "Cannot delete category with subcategories", 400);
      }

      const deletedCategory = await db
        .delete(categories)
        .where(eq(categories.id, Number(id)))
        .returning({ id: categories.id });

      if (!deletedCategory.length) {
        return sendError(res, "Category not found", 404);
      }

      return sendSuccess(res, null, "Category deleted successfully");
    } catch (error) {
      console.error("Delete category error:", error);
      return sendError(res, "Failed to delete category", 500);
    }
  }
}
