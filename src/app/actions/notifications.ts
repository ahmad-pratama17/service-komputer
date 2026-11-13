"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mode";
import { demoMarkAllNotificationsRead } from "@/lib/demo/mutations";

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * Menandai seluruh notifikasi milik pengguna yang sedang login sebagai sudah
 * dibaca. Satu action ini dipakai customer maupun admin; filter `user_id`
 * wajib ada supaya "tandai semua" tidak pernah menyentuh notifikasi orang lain.
 */
export async function markAllReadAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  if (isDemoMode()) {
    demoMarkAllNotificationsRead(user.id);
  } else if (hasSupabaseEnv) {
    const supabase = await createClient();

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
  revalidatePath("/admin");
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/orders");
  revalidatePath("/teknisi");
  revalidatePath("/teknisi/notifications");
  revalidatePath("/teknisi/orders");
}