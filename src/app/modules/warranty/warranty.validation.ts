import { z } from "zod";

export const createWarrantySchema = z.object({
  productId: z.number().int().positive(),
  warrantyPeriod: z.string().min(1, "Warranty period is required").max(50),
  warrantyType: z.string().max(100).optional(),
  details: z.string().max(1000).optional(),
});

export const updateWarrantySchema = z.object({
  warrantyPeriod: z.string().min(1).max(50).optional(),
  warrantyType: z.string().max(100).optional(),
  details: z.string().max(1000).optional(),
});

export type CreateWarrantyInput = z.infer<typeof createWarrantySchema>;
export type UpdateWarrantyInput = z.infer<typeof updateWarrantySchema>;
