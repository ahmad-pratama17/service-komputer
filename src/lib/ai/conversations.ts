import "server-only";

import { createClient } from "@/lib/supabase/server";
import { AI_HISTORY_LIMIT } from "@/lib/validations/ai";
import { isDemoMode } from "@/lib/demo/mode";
import { demoAiHistory } from "@/lib/demo/queries";
import { demoAppendChatMessage, demoClearChat } from "@/lib/demo/mutations";
import type { AiRole } from "@/types";

const GENERIC_ERROR = "Gagal memuat riwayat percakapan.";

export type AiMessage = {
  id: string;
  role: AiRole;
  message: string;
  created_at: string;
};

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function getAiHistory(
  userId: string,
  limit = AI_HISTORY_LIMIT,
): Promise<AiMessage[]> {
  if (isDemoMode()) {
    return demoAiHistory(userId, limit);
  }

  if (!hasSupabaseEnv) {
    return [];
  }

  const supabase = await createClient();

  // Ambil satu window terakhir, lalu dibalik agar urut kronologis.
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, role, message, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return (data ?? []).reverse();
}

export async function insertAiMessage(
  userId: string,
  role: AiRole,
  message: string,
): Promise<boolean> {
  if (isDemoMode()) {
    demoAppendChatMessage(userId, role, message);
    return true;
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: userId, role, message });

  return !error;
}

export async function clearAiHistory(userId: string): Promise<boolean> {
  if (isDemoMode()) {
    demoClearChat(userId);
    return true;
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("user_id", userId);

  return !error;
}

export { GENERIC_ERROR };
