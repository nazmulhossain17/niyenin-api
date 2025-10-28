import { z } from "zod";

export const createQuestionSchema = z.object({
  productId: z.number().int().positive(),
  userId: z.number().int().positive(),
  question: z
    .string()
    .min(10, "Question must be at least 10 characters")
    .max(1000),
});

export const createAnswerSchema = z.object({
  questionId: z.number().int().positive(),
  vendorId: z.number().int().positive(),
  answer: z.string().min(10, "Answer must be at least 10 characters").max(2000),
});

export const updateAnswerSchema = z.object({
  answer: z.string().min(10).max(2000).optional(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type CreateAnswerInput = z.infer<typeof createAnswerSchema>;
export type UpdateAnswerInput = z.infer<typeof updateAnswerSchema>;
