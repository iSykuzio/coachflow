import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export function friendlyPasswordUpdateError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("different")) return "Choose a password you have not used before.";
  if (normalized.includes("at least") || normalized.includes("weak") || normalized.includes("short")) {
    return "Password must be at least 8 characters.";
  }
  if (
    normalized.includes("session") ||
    normalized.includes("expired") ||
    normalized.includes("jwt") ||
    normalized.includes("invalid")
  ) {
    return "This reset link is invalid or has expired. Request a new one.";
  }
  return "We couldn’t update that password. Request a new reset link and try again.";
}
