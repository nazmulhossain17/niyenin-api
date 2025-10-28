import { z } from "zod";

export const createSpecificationSchema = z.object({
  productId: z.number().int().positive(),
  key: z.string().min(1, "Specification key is required").max(100),
  value: z.string().min(1, "Specification value is required").max(500),
});

export const updateSpecificationSchema = z.object({
  key: z.string().min(1).max(100).optional(),
  value: z.string().min(1).max(500).optional(),
});

export const bulkCreateSpecificationSchema = z.object({
  productId: z.number().int().positive(),
  specifications: z
    .array(
      z.object({
        key: z.string().min(1).max(100),
        value: z.string().min(1).max(500),
      })
    )
    .min(1, "At least one specification is required"),
});

export type CreateSpecificationInput = z.infer<
  typeof createSpecificationSchema
>;
export type UpdateSpecificationInput = z.infer<
  typeof updateSpecificationSchema
>;
export type BulkCreateSpecificationInput = z.infer<
  typeof bulkCreateSpecificationSchema
>;
