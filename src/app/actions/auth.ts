"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthApiError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, homePathFor } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/demo/mode";
import {
  clearDemoSessionCookie,
  setDemoSessionCookie,
  verifyPassword,
} from "@/lib/demo/auth";
import { demoCreateUser, demoUpdateProfile } from "@/lib/demo/mutations";
import { loadDb } from "@/lib/demo/store";
import {
  formError,
  loginSchema,
  parseZodErrors,
  registerSchema,
  updateProfileSchema,
  type AuthFormState,
} from "@/lib/validations/auth";

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  // Mode demo: kredensial dicocokkan ke store lokal, session via cookie.
  if (isDemoMode()) {
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return parseZodErrors(parsed.error);
    }

    const db = loadDb();
    const user = db.users.find(
      (row) => row.email.toLowerCase() === parsed.data.email.toLowerCase(),
    );

    if (
      !user ||
      !verifyPassword(
        parsed.data.password,
        user.password_salt,
        user.password_hash,
      )
    ) {
      return formError("Email atau password salah.");
    }

    await setDemoSessionCookie(user.id);
    redirect(homePathFor(user.role));
  }

  if (!hasSupabaseEnv) {
    return formError(
      "Konfigurasi Supabase belum diatur. Isi .env.local terlebih dahulu.",
    );
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return parseZodErrors(parsed.error);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error instanceof AuthApiError) {
      if (error.status === 400) {
        return formError("Email atau password salah.");
      }
      if (error.status === 422) {
        return formError("Email belum diverifikasi. Periksa inbox Anda.");
      }
    }
    return formError("Terjadi kesalahan saat masuk. Coba lagi.");
  }

  const user = await getCurrentUser();
  redirect(homePathFor(user?.role ?? "customer"));
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  // Mode demo: akun dibuat di store lokal dengan role customer.
  if (isDemoMode()) {
    const parsed = registerSchema.safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      phone: formData.get("phone") || null,
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      return parseZodErrors(parsed.error);
    }

    const result = demoCreateUser({
      email: parsed.data.email,
      name: parsed.data.fullName,
      phone: parsed.data.phone ?? null,
      password: parsed.data.password,
    });

    if (!result.ok) {
      return formError(result.error);
    }

    await setDemoSessionCookie(result.user.id);
    redirect(homePathFor(result.user.role));
  }

  if (!hasSupabaseEnv) {
    return formError(
      "Konfigurasi Supabase belum diatur. Isi .env.local terlebih dahulu.",
    );
  }

  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") || null,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return parseZodErrors(parsed.error);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
      },
    },
  });

  if (error) {
    return formError("Gagal mendaftar. Silakan coba lagi.");
  }

  if (!data.session) {
    return {
      status: "success",
      message:
        "Registrasi berhasil. Silakan verifikasi email Anda sebelum masuk.",
    };
  }

  // Role dibaca dari tabel profiles, bukan dari user_metadata. Metadata auth
  // bisa diisi sendiri oleh siapa pun yang memanggil signUp, jadi tidak boleh
  // dipakai untuk menentukan layar tujuan.
  const user = await getCurrentUser();
  redirect(homePathFor(user?.role ?? "customer"));
}

export async function logoutAction(): Promise<void> {
  if (isDemoMode()) {
    await clearDemoSessionCookie();
    redirect("/login");
  }

  if (!hasSupabaseEnv) {
    return;
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function updateProfileAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const parsed = updateProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || null,
  });

  if (!parsed.success) {
    return parseZodErrors(parsed.error);
  }

  if (isDemoMode()) {
    const saved = demoUpdateProfile(user.id, {
      name: parsed.data.fullName,
      phone: parsed.data.phone ?? null,
    });
    if (!saved) {
      return formError("Gagal menyimpan profil. Coba lagi.");
    }
    revalidatePath("/dashboard", "layout");
    return { status: "success", message: "Profil berhasil diperbarui." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.fullName,
      phone: parsed.data.phone,
    })
    .eq("id", user.id);

  if (error) {
    return formError("Gagal menyimpan profil. Coba lagi.");
  }

  revalidatePath("/dashboard", "layout");
  return { status: "success", message: "Profil berhasil diperbarui." };
}