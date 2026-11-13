import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Nama minimal 2 karakter")
      .max(120, "Nama maksimal 120 karakter"),
    email: z.string().email("Email tidak valid"),
    phone: z.string().max(32, "Nomor telepon terlalu panjang").optional().nullable(),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .regex(/[a-zA-Z]/, "Password harus mengandung huruf")
      .regex(/[0-9]/, "Password harus mengandung angka"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(120, "Nama maksimal 120 karakter"),
  phone: z.string().max(32, "Nomor telepon terlalu panjang").optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export function formError(message: string): AuthFormState {
  return { status: "error", message };
}

export function parseZodErrors(error: z.ZodError): AuthFormState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return {
    status: "error",
    message: error.issues[0]?.message ?? "Data tidak valid.",
    fieldErrors,
  };
}