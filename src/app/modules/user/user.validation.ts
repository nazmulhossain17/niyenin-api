import { z } from "zod";

export const createUserSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(40),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(40),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(11, "Phone number must be at least 11 digits").max(15),
  address: z.string().min(3, "Address is required"),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(2).max(40).optional(),
  lastName: z.string().min(2).max(40).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(11).max(15).optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
