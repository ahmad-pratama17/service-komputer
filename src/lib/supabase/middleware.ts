import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import type { UserRole } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/teknisi");

  if (!user) {
    if (isProtectedPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const needsRole =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/teknisi") ||
    pathname.startsWith("/dashboard") ||
    pathname === "/login" ||
    pathname === "/register";

  let role: UserRole = "customer";
  if (needsRole) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const dbRole = profile?.role;
    role = dbRole === "admin" || dbRole === "teknisi" ? dbRole : "customer";
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  // Area teknisi boleh dimasuki teknisi dan admin (pengawasan).
  if (pathname.startsWith("/teknisi") && role === "customer") {
    const url = request.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/dashboard") && role !== "customer") {
    const url = request.nextUrl.clone();
    url.pathname = role === "admin" ? "/admin" : "/teknisi";
    return NextResponse.redirect(url);
  }

  if (pathname === "/admin/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" || pathname === "/register") {
    const url = request.nextUrl.clone();
    url.pathname =
      role === "admin" ? "/admin" : role === "teknisi" ? "/teknisi" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}