import { z } from "zod";
/**
 * 🧾 Schema for creating a new category
 */
export const createCategorySchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, { message: "Category name must be at least 2 characters long" }),
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/, { message: "Slug must be URL-friendly" })
      .min(2, { message: "Slug must be at least 2 characters" }),
    parentId: z.string().min(4, { message: "Invalid parent category ID" }).nullable()
  }),
});

/**
 * 🧾 Schema for updating a category
 */
export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/, { message: "Slug must be URL-friendly" })
      .optional(),
    parentId: z.string().nullable().optional(),
  }),
  params: z.object({
    id: z.string().uuid({ message: "Invalid category ID" }),
  }),
});

/**
 * 🧾 Schema for validating route params (e.g. get/delete by ID)
 */
export const categoryIdSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: "Invalid category ID" }),
  }),
});
