import express from "express";
import { validateBody } from "../../../middleware/validation.middleware";
import { createVendorSchema, updateVendorSchema } from "./vendor.validation";
import { createVendor, deleteVendor, getVendorById, getVendors, updateVendor } from "./vendor.controller";

const router = express.Router();

// Create vendor
router.post("/", validateBody(createVendorSchema), createVendor);

// Get all vendors
router.get("/", getVendors);

// Get single vendor
router.get("/:id", getVendorById);

// Update vendor
router.put("/:id", validateBody(updateVendorSchema), updateVendor);

// Delete vendor
router.delete("/:id", deleteVendor);

export default router;