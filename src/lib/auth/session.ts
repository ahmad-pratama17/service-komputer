import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mode";
import { getDemoSessionUser } from "@/lib/demo/auth";
import type { UserRole } from "@/types";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
};

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  // Mode demo: session dibaca dari cookie bertanda tangan, tanpa Supabase.
  if (isDemoMode()) {
    const demo = await getDemoSessionUser();
    if (!demo) {
      return null;
    }
    return {
      id: demo.id,
      email: demo.email,
      name: demo.name,
      phone: demo.phone,
      role: demo.role,
    };
  }

  if (!hasSupabaseEnv) {
    return null;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, name, phone, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    phone: profile.phone ?? null,
    role: profile.role,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireCustomer(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "customer") {
    redirect("/unauthorized");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    redirect("/unauthorized");
  }
  return user;
}

export async function requireTeknisi(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "teknisi") {
    redirect("/unauthorized");
  }
  return user;
}

/**
 * Gerbang area /teknisi: teknisi dan admin boleh masuk. Admin diizinkan
 * mengawasi tampilan teknisi; batas tulis-menulis tetap di server action
 * dan RLS, bukan di gerbang halaman ini.
 */
export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "teknisi") {
    redirect("/unauthorized");
  }
  return user;
}

export function homePathFor(role: UserRole): string {
  if (role === "admin") {
    return "/admin";
  }
  if (role === "teknisi") {
    return "/teknisi";
  }
  return "/dashboard";
}