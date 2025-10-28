import type { Request, Response } from "express";
import { eq, count, ilike } from "drizzle-orm";
import { db } from "../../db";
import { brands } from "../../db/schema";
import { CreateBrandInput, UpdateBrandInput } from "./brand.validation";

export class BrandController {
  // Create brand
  static async createBrand(req: Request, res: Response) {
    try {
      const { name, slug }: CreateBrandInput = req.body;

      // Check if brand with same name or slug exists
      const existingBrand = await db
        .select({ id: brands.id })
        .from(brands)
        .where(eq(brands.slug, slug))
        .limit(1);

      if (existingBrand.length > 0) {
        return res.status(409).json({
          error: "Brand with this slug already exists",
        });
      }

      const newBrand = await db
        .insert(brands)
        .values({
          name,
          slug,
        })
        .returning({
          id: brands.id,
          name: brands.name,
          slug: brands.slug,
          createdAt: brands.createdAt,
        });

      return res.send(201).json({
        success: true,
        data: newBrand[0],
        message: "Brand created successfully",
      });
    } catch (error) {
      console.error("Create brand error:", error);
      return res.status(500).json({
        error: "Failed to create brand",
      });
    }
  }

  // Get all brands
  static async getAllBrands(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const search = req.query.search as string;
      const offset = (page - 1) * limit;

      let query = db
        .select({
          id: brands.id,
          name: brands.name,
          slug: brands.slug,
          createdAt: brands.createdAt,
        })
        .from(brands);

      // Add search filter if provided
      if (search) {
        query = query.where(ilike(brands.name, `%${search}%`));
      }

      // Get total count
      let countQuery = db.select({ count: count() }).from(brands);
      if (search) {
        countQuery = countQuery.where(ilike(brands.name, `%${search}%`));
      }
      const totalResult = await countQuery;
      const total = totalResult[0].count;

      // Get brands
      const brandsList = await query
        .limit(limit)
        .offset(offset)
        .orderBy(brands.name);
      return res.send(200).json({
        success: true,
        data: brandsList,
        message: "Brands retrieved successfully",
      });
    } catch (error) {
      console.error("Get all brands error:", error);
      return res.status(500).json({
        error: "Failed to retrieve brands",
      });
    }
  }

  // Get brand by ID
  static async getBrandById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const brand = await db
        .select({
          id: brands.id,
          name: brands.name,
          slug: brands.slug,
          createdAt: brands.createdAt,
        })
        .from(brands)
        .where(eq(brands.id, Number(id)))
        .limit(1);

      if (!brand.length) {
        return res.status(404).json({ error: "Brand not found" });
      }

      return res.status(200).json({
        success: true,
        data: brand[0],
        message: "Brand retrieved successfully",
      });
    } catch (error) {
      console.error("Get brand by ID error:", error);
      return res.status(500).json({ error: "Failed to retrieve brand" });
    }
  }

  // Get brand by slug
  static async getBrandBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;

      const brand = await db
        .select({
          id: brands.id,
          name: brands.name,
          slug: brands.slug,
          createdAt: brands.createdAt,
        })
        .from(brands)
        .where(eq(brands.slug, slug))
        .limit(1);

      if (!brand.length) {
        return res.status(404).json({ error: "Brand not found" });
      }
      return res.status(200).json({
        success: true,
        data: brand[0],
        message: "Brand retrieved successfully",
      });
    } catch (error) {
      console.error("Get brand by slug error:", error);
      return res.status(500).json({ error: "Failed to retrieve brand" });
    }
  }

  // Update brand
  static async updateBrand(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: UpdateBrandInput = req.body;

      // Check if slug is being updated and if it already exists
      if (updateData.slug) {
        const existingBrand = await db
          .select({ id: brands.id })
          .from(brands)
          .where(eq(brands.slug, updateData.slug))
          .limit(1);

        if (existingBrand.length > 0 && existingBrand[0].id !== Number(id)) {
          return res.status(409).json({
            error: "Brand with this slug already exists",
          });
        }
      }

      const updatedBrand = await db
        .update(brands)
        .set(updateData)
        .where(eq(brands.id, Number(id)))
        .returning({
          id: brands.id,
          name: brands.name,
          slug: brands.slug,
          createdAt: brands.createdAt,
        });

      if (!updatedBrand.length) {
        return res.status(404).json({ error: "Brand not found" });
      }

      return res.status(200).json({
        success: true,
        data: updatedBrand[0],
        message: "Brand updated successfully",
      });
    } catch (error) {
      console.error("Update brand error:", error);
      return res.status(500).json({ error: "Failed to update brand" });
    }
  }

  // Delete brand
  static async deleteBrand(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const deletedBrand = await db
        .delete(brands)
        .where(eq(brands.id, Number(id)))
        .returning({ id: brands.id });

      if (!deletedBrand.length) {
        return res.status(404).json({ error: "Brand not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Brand deleted successfully",
      });
    } catch (error) {
      console.error("Delete brand error:", error);
      return res.status(500).json({ error: "Failed to delete brand" });
    }
  }
}
