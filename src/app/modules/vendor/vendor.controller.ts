import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { vendors } from "../../../db/schema";


/**
 * ✅ Create Vendor
 */
export const createVendor = async (req: Request, res: Response) => {
  try {
    const { userId, shopName, description } = req.body;

    if (!userId || !shopName) {
      return res
        .status(400)
        .json({ message: "userId and shopName are required." });
    }

    // Check if user already has a vendor
    const [existing] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.userId, userId));

    if (existing) {
      return res
        .status(409)
        .json({ message: "This user already has a vendor profile." });
    }

    const [newVendor] = await db
      .insert(vendors)
      .values({
        userId,
        shopName,
        description: description || null,
      })
      .returning();

    res.status(201).json({
      message: "✅ Vendor created successfully",
      vendor: newVendor,
    });
  } catch (err: any) {
    console.error("❌ Error creating vendor:", err);
    res.status(500).json({
      message: "Error creating vendor",
      error: err.message,
    });
  }
};

/**
 * ✅ Get All Vendors
 */
export const getVendors = async (req: Request, res: Response) => {
  try {
    const allVendors = await db.select().from(vendors);
    res.json(allVendors);
  } catch (err: any) {
    res.status(500).json({
      message: "Error fetching vendors",
      error: err.message,
    });
  }
};

/**
 * ✅ Get Single Vendor
 */
export const getVendorById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.vendorId, id));

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.json(vendor);
  } catch (err: any) {
    res.status(500).json({
      message: "Error fetching vendor",
      error: err.message,
    });
  }
};

/**
 * ✅ Update Vendor
 */
export const updateVendor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { shopName, description, isActive } = req.body;

    await db
      .update(vendors)
      .set({
        shopName,
        description: description ?? null,
        isActive: isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(vendors.vendorId, id));

    res.json({ message: "✅ Vendor updated successfully" });
  } catch (err: any) {
    res.status(500).json({
      message: "Error updating vendor",
      error: err.message,
    });
  }
};

/**
 * ✅ Delete Vendor
 */
export const deleteVendor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.delete(vendors).where(eq(vendors.vendorId, id));

    res.json({ message: "🗑️ Vendor deleted successfully" });
  } catch (err: any) {
    res.status(500).json({
      message: "Error deleting vendor",
      error: err.message,
    });
  }
};