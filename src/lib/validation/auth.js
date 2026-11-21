import { z } from "zod";

/** Auth request schemas. Strict objects: unknown keys are rejected (mass-assignment guard). */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email is too long.")
  .pipe(z.email("Enter a valid email address."));

// Login accepts any non-empty password up to the max; policy is only enforced when setting one.
export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128, "Password is too long."),
});

export const otpCodeSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code.");

export const verifyCodeSchema = z.strictObject({ code: otpCodeSchema });

export const recoveryCodeSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{5}-?[A-Z0-9]{5}$/, "Enter a recovery code like ABCDE-12345."),
});

export const sendOtpSchema = z.strictObject({ method: z.literal("email") });

export const idSchema = z.string().regex(/^c[a-z0-9]{20,32}$/, "Invalid id.");

export const passwordChangeSchema = z.strictObject({
  currentPassword: z.string().min(1, "Enter your current password.").max(128),
  newPassword: z.string().min(12, "Use at least 12 characters.").max(128, "Use at most 128 characters."),
});

export const resetRequestSchema = z.strictObject({ email: emailSchema });

export const resetConfirmSchema = z.strictObject({
  token: z.string().regex(/^[A-Za-z0-9_-]{40,60}$/, "This reset link is not valid."),
  newPassword: z.string().min(12, "Use at least 12 characters.").max(128, "Use at most 128 characters."),
});

export const mfaToggleRequestSchema = z.strictObject({
  method: z.enum(["totp", "email"]),
  enable: z.boolean(),
  userId: idSchema.optional(), // super admin acting on another account
});

export const mfaToggleConfirmSchema = z.strictObject({ requestId: idSchema, code: otpCodeSchema });

export const totpConfirmSchema = z.strictObject({ code: otpCodeSchema });

export const emailChangeStartSchema = z.strictObject({
  newEmail: emailSchema,
  currentPassword: z.string().min(1, "Enter your current password.").max(128),
});

export const emailChangeOtpSchema = z.strictObject({ requestId: idSchema, code: otpCodeSchema });

export const emailChangeConfirmSchema = z.strictObject({
  token: z.string().regex(/^[A-Za-z0-9_-]{40,60}$/, "This confirmation link is not valid."),
});
