import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username cannot exceed 20 characters"),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),

  password: z.string().min(1, "Password is required"),
});