import { z } from "zod";

export const createVendorSchema = z.object({
  userId: z.string(),
  shopName: z
    .string()
    .min(2, "Shop name must be at least 2 characters")
    .max(200),
  description: z.string(),
});

export const updateVendorSchema = z.object({
  shopName: z.string().optional(),
  description: z.string().optional(),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
