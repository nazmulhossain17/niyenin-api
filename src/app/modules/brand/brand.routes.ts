import express from "express";
import { validateBody } from "../../../middleware/validation.middleware";
import { createBrandSchema, updateBrandSchema } from "./brand.validation";
import { createBrand, deleteBrand, getBrandById, getBrands, updateBrand } from "./brand.controller";

const router = express.Router();

router.post("/", validateBody(createBrandSchema), createBrand);
router.get("/", getBrands);
router.get("/:id", getBrandById);
router.put("/:id", validateBody(updateBrandSchema), updateBrand);
router.delete("/:id", deleteBrand);

export default router;