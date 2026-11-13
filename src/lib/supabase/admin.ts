import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Client service-role untuk pekerjaan latar yang tidak terkait sesi pengguna,
 * misalnya mengirim antrean notifikasi. RLS dilewati karena pemanggil sudah
 * diotorisasi oleh kode server.
 *
 * Sengaja memakai `createClient` (bukan `createServerClient`) dan hanya bisa
 * dipanggil dari server: nilainya tidak boleh pernah sampai ke bundle browser.
 */
export function hasServiceRoleKey(): boolean {
  return Boolean(serviceRoleKey && process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function createServiceRoleClient() {
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum diisi. Tambahkan ke .env.local untuk mengaktifkan pemrosesan outbox.",
    );
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}