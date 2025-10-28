import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createBrandSchema = z.object({
  name: z.string().min(2, "Brand name must be at least 2 characters").max(100),
  slug: z.string().regex(slugRegex, "Slug must be lowercase with hyphens only"),
});

export const updateBrandSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().regex(slugRegex).optional(),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
