import { z } from "zod";



export const createBrandSchema = z.object({
  name: z.string().min(2, "Brand name must be at least 2 characters").max(150),
  slug: z.string(),
});

export const updateBrandSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  slug: z.string().optional(),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
