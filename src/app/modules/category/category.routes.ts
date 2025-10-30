import express from "express";
import { createCategory, deleteCategory, getCategories, getCategoryById, updateCategory } from "./category.controller";
import { validateBody } from "../../../middleware/validation.middleware";
import { categoryIdSchema, createCategorySchema, updateCategorySchema } from "./category.validation";

const router = express.Router();

router.post("/", validateBody(createCategorySchema), createCategory);
router.get("/", getCategories);
router.get("/:id", validateBody(categoryIdSchema), getCategoryById);
router.put("/:id", validateBody(updateCategorySchema), updateCategory);
router.delete("/:id", validateBody(categoryIdSchema), deleteCategory);
export default router;