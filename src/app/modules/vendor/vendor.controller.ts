import type { Request, Response } from "express";
import { eq, count } from "drizzle-orm";

import type { CreateVendorInput, UpdateVendorInput } from "./vendor.validation";
import { db } from "../../db";
import { users, vendors } from "../../db/schema";

export class VendorController {
  // Create vendor profile
  static async createVendor(req: Request, res: Response) {
    try {
      const { userId, shopName, description }: CreateVendorInput = req.body;

      // Check if user exists and has vendor role
      const user = await db
        .select({
          id: users.id,
          role: users.role,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user[0].role !== "vendor" && user[0].role !== "admin") {
        return res.status(403).json({ error: "User must have vendor role" });
      }

      if (!user[0].isActive) {
        return res.status(403).json({ error: "User account is inactive" });
      }

      // Check if vendor profile already exists for this user
      const existingVendor = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.userId, userId))
        .limit(1);

      if (existingVendor.length > 0) {
        return res
          .status(409)
          .json({ error: "Vendor profile already exists for this user" });
      }

      // Create vendor
      const newVendor = await db
        .insert(vendors)
        .values({
          userId,
          shopName,
          description,
        })
        .returning({
          id: vendors.id,
          userId: vendors.userId,
          shopName: vendors.shopName,
          description: vendors.description,
          isActive: vendors.isActive,
          createdAt: vendors.createdAt,
        });
      return res.status(201).json({
        success: true,
        data: newVendor[0],
        message: "Vendor profile created successfully",
      });
    } catch (error) {
      console.error("Create vendor error:", error);
      return res.status(500).json({ error: "Failed to create vendor profile" });
    }
  }

  // Get all vendors
  static async getAllVendors(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Get total count
      const totalResult = await db.select({ count: count() }).from(vendors);
      const total = totalResult[0].count;

      // Get vendors with user information
      const vendorsList = await db
        .select({
          id: vendors.id,
          userId: vendors.userId,
          shopName: vendors.shopName,
          description: vendors.description,
          isActive: vendors.isActive,
          createdAt: vendors.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(vendors)
        .innerJoin(users, eq(vendors.userId, users.id))
        .limit(limit)
        .offset(offset)
        .orderBy(vendors.createdAt);

      //   return sendPaginatedResponse(
      //     res,
      //     vendorsList,
      //     page,
      //     limit,
      //     total,
      //     "Vendors retrieved successfully"
      //   );
      return res.status(200).json({
        success: true,
        data: vendorsList,
        message: "Vendors retrieved successfully",
      });
    } catch (error) {
      console.error("Get all vendors error:", error);
      return res.status(500).json({ error: "Failed to retrieve vendors" });
    }
  }

  // Get vendor by ID
  static async getVendorById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const vendor = await db
        .select({
          id: vendors.id,
          userId: vendors.userId,
          shopName: vendors.shopName,
          description: vendors.description,
          isActive: vendors.isActive,
          createdAt: vendors.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(vendors)
        .innerJoin(users, eq(vendors.userId, users.id))
        .where(eq(vendors.id, Number(id)))
        .limit(1);

      if (!vendor.length) {
        // return sendError(res, "Vendor not found", 404);
        return res.status(404).json({ error: "Vendor not found" });
      }

      return res.status(200).json({
        success: true,
        data: vendor[0],
        message: "Vendor retrieved successfully",
      });
    } catch (error) {
      console.error("Get vendor by ID error:", error);
      return res.status(500).json({ error: "Failed to retrieve vendor" });
    }
  }

  // Get current user's vendor profile
  static async getMyVendorProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.id;

      const vendor = await db
        .select({
          id: vendors.id,
          userId: vendors.userId,
          shopName: vendors.shopName,
          description: vendors.description,
          isActive: vendors.isActive,
          createdAt: vendors.createdAt,
        })
        .from(vendors)
        .where(eq(vendors.userId, userId))
        .limit(1);

      if (!vendor.length) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }

      return res.status(200).json({
        success: true,
        data: vendor[0],
        message: "Vendor profile retrieved successfully",
      });
    } catch (error) {
      console.error("Get my vendor profile error:", error);
      return res
        .status(500)
        .json({ error: "Failed to retrieve vendor profile" });
    }
  }

  // Update vendor profile
  static async updateVendor(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: UpdateVendorInput = req.body;
      const currentUserId = req.user!.id;
      const currentUserRole = req.user!.role;

      // Get vendor to check ownership
      const vendor = await db
        .select({
          id: vendors.id,
          userId: vendors.userId,
        })
        .from(vendors)
        .where(eq(vendors.id, Number(id)))
        .limit(1);

      if (!vendor.length) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      // Check if user owns this vendor profile or is admin
      if (vendor[0].userId !== currentUserId && currentUserRole !== "admin") {
        return res
          .status(403)
          .json({ error: "Not authorized to update this vendor profile" });
      }

      const updatedVendor = await db
        .update(vendors)
        .set(updateData)
        .where(eq(vendors.id, Number(id)))
        .returning({
          id: vendors.id,
          userId: vendors.userId,
          shopName: vendors.shopName,
          description: vendors.description,
          isActive: vendors.isActive,
          createdAt: vendors.createdAt,
        });

      if (!updatedVendor.length) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      return res.status(200).json({
        success: true,
        data: updatedVendor[0],
        message: "Vendor profile updated successfully",
      });
    } catch (error) {
      console.error("Update vendor error:", error);
      return res.status(500).json({ error: "Failed to update vendor profile" });
    }
  }

  // Update current user's vendor profile
  static async updateMyVendorProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const updateData: UpdateVendorInput = req.body;

      const updatedVendor = await db
        .update(vendors)
        .set(updateData)
        .where(eq(vendors.userId, userId))
        .returning({
          id: vendors.id,
          userId: vendors.userId,
          shopName: vendors.shopName,
          description: vendors.description,
          isActive: vendors.isActive,
          createdAt: vendors.createdAt,
        });

      if (!updatedVendor.length) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }

      return res.status(200).json({
        success: true,
        data: updatedVendor[0],
        message: "Vendor profile updated successfully",
      });
    } catch (error) {
      console.error("Update my vendor profile error:", error);
      return res.status(500).json({ error: "Failed to update vendor profile" });
    }
  }

  // Delete vendor (admin only)
  static async deleteVendor(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const deletedVendor = await db
        .delete(vendors)
        .where(eq(vendors.id, Number(id)))
        .returning({ id: vendors.id });

      if (!deletedVendor.length) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Vendor deleted successfully",
      });
    } catch (error) {
      console.error("Delete vendor error:", error);
      return res.status(500).json({ error: "Failed to delete vendor" });
    }
  }

  // Get vendors by status (active/inactive)
  static async getVendorsByStatus(req: Request, res: Response) {
    try {
      const { status } = req.params;
      const isActive = status === "active";
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(vendors)
        .where(eq(vendors.isActive, isActive));
      const total = totalResult[0].count;

      // Get vendors
      const vendorsList = await db
        .select({
          id: vendors.id,
          userId: vendors.userId,
          shopName: vendors.shopName,
          description: vendors.description,
          isActive: vendors.isActive,
          createdAt: vendors.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(vendors)
        .innerJoin(users, eq(vendors.userId, users.id))
        .where(eq(vendors.isActive, isActive))
        .limit(limit)
        .offset(offset)
        .orderBy(vendors.createdAt);
      return res.status(200).json({
        success: true,
        data: vendorsList,
        message: `${status} vendors retrieved successfully`,
      });
    } catch (error) {
      console.error("Get vendors by status error:", error);
      return res.status(500).json({ error: "Failed to retrieve vendors" });
    }
  }
}
