import type { Request, Response } from "express";
import { eq } from "drizzle-orm";

import type {
  CreateSpecificationInput,
  UpdateSpecificationInput,
  BulkCreateSpecificationInput,
} from "./specification.validation";
import { db } from "../../db";
import { products } from "../../db/schema";

export class SpecificationController {
  // Create specification
  static async createSpecification(req: Request, res: Response) {
    try {
      const specData: CreateSpecificationInput = req.body;
      const currentUserId = req.user!.id;
      const currentUserRole = req.user!.role;

      // Check if product exists and user has permission
      const product = await db
        .select({
          id: products.id,
          vendorId: products.vendorId,
        })
        .from(products)
        .where(eq(products.id, specData.productId))
        .limit(1);

      if (!product.length) {
        return sendError(res, "Product not found", 404);
      }

      // If not admin, check if user owns the vendor
      if (currentUserRole !== "admin") {
        const vendor = await db
          .select({ userId: vendors.userId })
          .from(vendors)
          .where(eq(vendors.id, product[0].vendorId))
          .limit(1);

        if (!vendor.length || vendor[0].userId !== currentUserId) {
          return sendError(
            res,
            "Not authorized to add specifications for this product",
            403
          );
        }
      }

      const newSpec = await db
        .insert(productSpecifications)
        .values(specData)
        .returning({
          id: productSpecifications.id,
          productId: productSpecifications.productId,
          key: productSpecifications.key,
          value: productSpecifications.value,
          createdAt: productSpecifications.createdAt,
        });

      return sendSuccess(
        res,
        newSpec[0],
        "Specification created successfully",
        201
      );
    } catch (error) {
      console.error("Create specification error:", error);
      return sendError(res, "Failed to create specification", 500);
    }
  }

  // Bulk create specifications
  static async bulkCreateSpecifications(req: Request, res: Response) {
    try {
      const { productId, specifications }: BulkCreateSpecificationInput =
        req.body;
      const currentUserId = req.user!.id;
      const currentUserRole = req.user!.role;

      // Check if product exists and user has permission
      const product = await db
        .select({
          id: products.id,
          vendorId: products.vendorId,
        })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product.length) {
        return sendError(res, "Product not found", 404);
      }

      // If not admin, check if user owns the vendor
      if (currentUserRole !== "admin") {
        const vendor = await db
          .select({ userId: vendors.userId })
          .from(vendors)
          .where(eq(vendors.id, product[0].vendorId))
          .limit(1);

        if (!vendor.length || vendor[0].userId !== currentUserId) {
          return sendError(
            res,
            "Not authorized to add specifications for this product",
            403
          );
        }
      }

      // Prepare data for bulk insert
      const specsToInsert = specifications.map((spec) => ({
        productId,
        key: spec.key,
        value: spec.value,
      }));

      const newSpecs = await db
        .insert(productSpecifications)
        .values(specsToInsert)
        .returning({
          id: productSpecifications.id,
          productId: productSpecifications.productId,
          key: productSpecifications.key,
          value: productSpecifications.value,
          createdAt: productSpecifications.createdAt,
        });

      return sendSuccess(
        res,
        newSpecs,
        "Specifications created successfully",
        201
      );
    } catch (error) {
      console.error("Bulk create specifications error:", error);
      return sendError(res, "Failed to create specifications", 500);
    }
  }

  // Get specifications by product ID
  static async getSpecificationsByProduct(req: Request, res: Response) {
    try {
      const { productId } = req.params;

      const specifications = await db
        .select({
          id: productSpecifications.id,
          productId: productSpecifications.productId,
          key: productSpecifications.key,
          value: productSpecifications.value,
          createdAt: productSpecifications.createdAt,
        })
        .from(productSpecifications)
        .where(eq(productSpecifications.productId, Number(productId)))
        .orderBy(productSpecifications.key);

      return sendSuccess(
        res,
        specifications,
        "Specifications retrieved successfully"
      );
    } catch (error) {
      console.error("Get specifications by product error:", error);
      return sendError(res, "Failed to retrieve specifications", 500);
    }
  }

  // Get specification by ID
  static async getSpecificationById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const specification = await db
        .select({
          id: productSpecifications.id,
          productId: productSpecifications.productId,
          key: productSpecifications.key,
          value: productSpecifications.value,
          createdAt: productSpecifications.createdAt,
        })
        .from(productSpecifications)
        .where(eq(productSpecifications.id, Number(id)))
        .limit(1);

      if (!specification.length) {
        return sendError(res, "Specification not found", 404);
      }

      return sendSuccess(
        res,
        specification[0],
        "Specification retrieved successfully"
      );
    } catch (error) {
      console.error("Get specification by ID error:", error);
      return sendError(res, "Failed to retrieve specification", 500);
    }
  }

  // Update specification
  static async updateSpecification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: UpdateSpecificationInput = req.body;
      const currentUserId = req.user!.id;
      const currentUserRole = req.user!.role;

      // Get specification and check ownership
      const specification = await db
        .select({
          id: productSpecifications.id,
          productId: productSpecifications.productId,
        })
        .from(productSpecifications)
        .where(eq(productSpecifications.id, Number(id)))
        .limit(1);

      if (!specification.length) {
        return sendError(res, "Specification not found", 404);
      }

      // If not admin, check if user owns the vendor
      if (currentUserRole !== "admin") {
        const product = await db
          .select({ vendorId: products.vendorId })
          .from(products)
          .where(eq(products.id, specification[0].productId))
          .limit(1);

        if (product.length) {
          const vendor = await db
            .select({ userId: vendors.userId })
            .from(vendors)
            .where(eq(vendors.id, product[0].vendorId))
            .limit(1);

          if (!vendor.length || vendor[0].userId !== currentUserId) {
            return sendError(
              res,
              "Not authorized to update this specification",
              403
            );
          }
        }
      }

      const updatedSpec = await db
        .update(productSpecifications)
        .set(updateData)
        .where(eq(productSpecifications.id, Number(id)))
        .returning({
          id: productSpecifications.id,
          productId: productSpecifications.productId,
          key: productSpecifications.key,
          value: productSpecifications.value,
          createdAt: productSpecifications.createdAt,
        });

      if (!updatedSpec.length) {
        return sendError(res, "Specification not found", 404);
      }

      return sendSuccess(
        res,
        updatedSpec[0],
        "Specification updated successfully"
      );
    } catch (error) {
      console.error("Update specification error:", error);
      return sendError(res, "Failed to update specification", 500);
    }
  }

  // Delete specification
  static async deleteSpecification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const currentUserId = req.user!.id;
      const currentUserRole = req.user!.role;

      // Get specification and check ownership
      const specification = await db
        .select({
          id: productSpecifications.id,
          productId: productSpecifications.productId,
        })
        .from(productSpecifications)
        .where(eq(productSpecifications.id, Number(id)))
        .limit(1);

      if (!specification.length) {
        return sendError(res, "Specification not found", 404);
      }

      // If not admin, check if user owns the vendor
      if (currentUserRole !== "admin") {
        const product = await db
          .select({ vendorId: products.vendorId })
          .from(products)
          .where(eq(products.id, specification[0].productId))
          .limit(1);

        if (product.length) {
          const vendor = await db
            .select({ userId: vendors.userId })
            .from(vendors)
            .where(eq(vendors.id, product[0].vendorId))
            .limit(1);

          if (!vendor.length || vendor[0].userId !== currentUserId) {
            return sendError(
              res,
              "Not authorized to delete this specification",
              403
            );
          }
        }
      }

      const deletedSpec = await db
        .delete(productSpecifications)
        .where(eq(productSpecifications.id, Number(id)))
        .returning({ id: productSpecifications.id });

      if (!deletedSpec.length) {
        return sendError(res, "Specification not found", 404);
      }

      return sendSuccess(res, null, "Specification deleted successfully");
    } catch (error) {
      console.error("Delete specification error:", error);
      return sendError(res, "Failed to delete specification", 500);
    }
  }
}
