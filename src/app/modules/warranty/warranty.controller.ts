import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import type {
  CreateWarrantyInput,
  UpdateWarrantyInput,
} from "./warranty.validation";
import { db } from "../../db";
import { products, productWarranty, vendors } from "../../db/schema";

export class WarrantyController {
  // Create warranty
  static async createWarranty(req: Request, res: Response) {
    try {
      const warrantyData: CreateWarrantyInput = req.body;
      const currentUserId = req.user!.id;
      const currentUserRole = req.user!.role;

      // Check if product exists and user has permission
      const product = await db
        .select({
          id: products.id,
          vendorId: products.vendorId,
        })
        .from(products)
        .where(eq(products.id, warrantyData.productId))
        .limit(1);

      if (!product.length) {
        return res.status(404).json({ error: "Product not found" });
      }

      // If not admin, check if user owns the vendor
      if (currentUserRole !== "admin") {
        const vendor = await db
          .select({ userId: vendors.userId })
          .from(vendors)
          .where(eq(vendors.id, product[0].vendorId))
          .limit(1);

        if (!vendor.length || vendor[0].userId !== currentUserId) {
          return res
            .status(403)
            .json({ error: "Not authorized to add warranty for this product" });
        }
      }

      // Check if warranty already exists for this product
      const existingWarranty = await db
        .select({ id: productWarranty.id })
        .from(productWarranty)
        .where(eq(productWarranty.productId, warrantyData.productId))
        .limit(1);

      if (existingWarranty.length > 0) {
        return res.status(409).json({ error: "Warranty already exists" });
      }

      const newWarranty = await db
        .insert(productWarranty)
        .values(warrantyData)
        .returning({
          id: productWarranty.id,
          productId: productWarranty.productId,
          warrantyPeriod: productWarranty.warrantyPeriod,
          warrantyType: productWarranty.warrantyType,
          details: productWarranty.details,
          createdAt: productWarranty.createdAt,
        });
      return res.status(201).json({
        success: true,
        data: newWarranty[0],
        message: "Warranty created successfully",
      });
    } catch (error) {
      console.error("Create warranty error:", error);
      return res.status(500).json({ error: "Failed to create warranty" });
    }
  }

  // Get warranty by product ID
  static async getWarrantyByProduct(req: Request, res: Response) {
    try {
      const { productId } = req.params;

      const warranty = await db
        .select({
          id: productWarranty.id,
          productId: productWarranty.productId,
          warrantyPeriod: productWarranty.warrantyPeriod,
          warrantyType: productWarranty.warrantyType,
          details: productWarranty.details,
          createdAt: productWarranty.createdAt,
        })
        .from(productWarranty)
        .where(eq(productWarranty.productId, Number(productId)))
        .limit(1);

      if (!warranty.length) {
        return res
          .status(404)
          .json({ error: "Warranty not found for this product" });
      }

      return res.status(200).json(warranty[0]);
    } catch (error) {
      console.error("Get warranty by product error:", error);
      return res.status(500).json({ error: "Failed to retrieve warranty" });
    }
  }

  // Get warranty by ID
  static async getWarrantyById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const warranty = await db
        .select({
          id: productWarranty.id,
          productId: productWarranty.productId,
          warrantyPeriod: productWarranty.warrantyPeriod,
          warrantyType: productWarranty.warrantyType,
          details: productWarranty.details,
          createdAt: productWarranty.createdAt,
        })
        .from(productWarranty)
        .where(eq(productWarranty.id, Number(id)))
        .limit(1);

      if (!warranty.length) {
        return res.status(404).json({ error: "Warranty not found" });
      }

      return res.status(200).json(warranty[0]);
    } catch (error) {
      console.error("Get warranty by ID error:", error);
      return res.status(500).json({ error: "Failed to retrieve warranty" });
    }
  }

  // Update warranty
  static async updateWarranty(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: UpdateWarrantyInput = req.body;
      const currentUserId = req.user!.id;
      const currentUserRole = req.user!.role;

      // Get warranty and check ownership
      const warranty = await db
        .select({
          id: productWarranty.id,
          productId: productWarranty.productId,
        })
        .from(productWarranty)
        .where(eq(productWarranty.id, Number(id)))
        .limit(1);

      if (!warranty.length) {
        return res.status(404).json({ error: "Warranty not found" });
      }

      // If not admin, check if user owns the vendor
      if (currentUserRole !== "admin") {
        const product = await db
          .select({ vendorId: products.vendorId })
          .from(products)
          .where(eq(products.id, warranty[0].productId))
          .limit(1);

        if (product.length) {
          const vendor = await db
            .select({ userId: vendors.userId })
            .from(vendors)
            .where(eq(vendors.id, product[0].vendorId))
            .limit(1);

          if (!vendor.length || vendor[0].userId !== currentUserId) {
            return res
              .status(403)
              .json({ error: "Not authorized to update this warranty" });
          }
        }
      }

      const updatedWarranty = await db
        .update(productWarranty)
        .set(updateData)
        .where(eq(productWarranty.id, Number(id)))
        .returning({
          id: productWarranty.id,
          productId: productWarranty.productId,
          warrantyPeriod: productWarranty.warrantyPeriod,
          warrantyType: productWarranty.warrantyType,
          details: productWarranty.details,
          createdAt: productWarranty.createdAt,
        });

      if (!updatedWarranty.length) {
        return res.status(404).json({ error: "Warranty not found" });
      }

      return res.status(200).json({
        success: true,
        data: updatedWarranty[0],
        message: "Warranty updated successfully",
      });
    } catch (error) {
      console.error("Update warranty error:", error);
      return res.status(500).json({ error: "Failed to update warranty" });
    }
  }

  // Delete warranty
  static async deleteWarranty(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const currentUserId = req.user!.id;
      const currentUserRole = req.user!.role;

      // Get warranty and check ownership
      const warranty = await db
        .select({
          id: productWarranty.id,
          productId: productWarranty.productId,
        })
        .from(productWarranty)
        .where(eq(productWarranty.id, Number(id)))
        .limit(1);

      if (!warranty.length) {
        return res.status(404).json({ error: "Warranty not found" });
      }

      // If not admin, check if user owns the vendor
      if (currentUserRole !== "admin") {
        const product = await db
          .select({ vendorId: products.vendorId })
          .from(products)
          .where(eq(products.id, warranty[0].productId))
          .limit(1);

        if (product.length) {
          const vendor = await db
            .select({ userId: vendors.userId })
            .from(vendors)
            .where(eq(vendors.id, product[0].vendorId))
            .limit(1);

          if (!vendor.length || vendor[0].userId !== currentUserId) {
            return res
              .status(403)
              .json({ error: "Not authorized to delete this warranty" });
          }
        }
      }

      const deletedWarranty = await db
        .delete(productWarranty)
        .where(eq(productWarranty.id, Number(id)))
        .returning({ id: productWarranty.id });

      if (!deletedWarranty.length) {
        return res.status(404).json({ error: "Warranty not found" });
      }

      return res.status(200).json({
        success: true,
        data: null,
        message: "Warranty deleted successfully",
      });
    } catch (error) {
      console.error("Delete warranty error:", error);
      return res.status(500).json({ error: "Failed to delete warranty" });
    }
  }
}
