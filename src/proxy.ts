import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isDemoMode } from "@/lib/demo/mode";

export async function proxy(request: NextRequest) {
  // Mode demo (env kosong ATAU masih placeholder): lewatkan tanpa menyentuh
  // Supabase. Otorisasi ditangani per-halaman lewat requireCustomer/
  // requireAdmin yang membaca session demo. Pengecekan truthiness saja tidak
  // cukup karena .env.local bawaan berisi placeholder yang truthy.
  if (isDemoMode()) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};