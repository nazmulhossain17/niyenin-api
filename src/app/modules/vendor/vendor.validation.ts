import { z } from "zod";

export const createVendorSchema = z.object({
  userId: z.number().int().positive(),
  shopName: z
    .string()
    .min(2, "Shop name must be at least 2 characters")
    .max(200),
  description: z.string().max(1000).optional(),
});

export const updateVendorSchema = z.object({
  shopName: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
