"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  clearAiHistory,
  getAiHistory,
  insertAiMessage,
} from "@/lib/ai/conversations";
import { getAssistantServices } from "@/lib/ai/services";
import { completeAssistantReply, isAiConfigured } from "@/lib/ai/openai";
import { checkAiRateLimit } from "@/lib/ai/rate-limit";
import { aiMessageSchema } from "@/lib/validations/ai";
import { isDemoMode } from "@/lib/demo/mode";
import { demoAssistantReply } from "@/lib/demo/assistant";
import {
  demoAppendChatMessage,
  demoCheckChatRateLimit,
} from "@/lib/demo/mutations";

export type AiActionState = {
  ok: boolean;
  message: string;
  /** Balasan assistant yang baru, dipakai UI tanpa menunggu render ulang. */
  reply?: string;
};

const AUTH_ERROR = "Sesi tidak valid. Silakan masuk kembali.";
const AI_DISABLED = "AI Assistant belum dikonfigurasi. Silakan hubungi admin.";
const AI_PATH = "/dashboard/ai";

/**
 * Satu Server Action untuk satu giliran percakapan. Urutannya penting:
 * validasi → rate limit → simpan pesan user → panggil OpenAI → simpan balasan.
 * Semua pemanggilan OpenAI hanya terjadi di server.
 */
export async function sendAiMessageAction(
  _prev: AiActionState | null,
  formData: FormData,
): Promise<AiActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: AUTH_ERROR };
  }

  const parsed = aiMessageSchema.safeParse({ message: formData.get("message") });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Pesan tidak valid.",
    };
  }

  const message = parsed.data.message;

  // Mode demo: tanpa API key. Jawaban aturan lokal, riwayat di store lokal.
  if (isDemoMode()) {
    const demoLimit = demoCheckChatRateLimit(user.id, message.length);
    if (!demoLimit.ok) {
      return { ok: false, message: demoLimit.error };
    }
    demoAppendChatMessage(user.id, "user", message);
    const services = await getAssistantServices();
    const reply = demoAssistantReply(message, services, user.role);
    demoAppendChatMessage(user.id, "assistant", reply);
    revalidatePath(AI_PATH);
    return { ok: true, message: "Balasan diterima.", reply };
  }

  if (!isAiConfigured()) {
    return { ok: false, message: AI_DISABLED };
  }

  const supabase = await createClient();

  const limit = await checkAiRateLimit(supabase, user.id, message.length);

  if (!limit.ok) {
    return { ok: false, message: limit.error };
  }

  const history = await getAiHistory(user.id);

  const savedUserMessage = await insertAiMessage(user.id, "user", message);

  if (!savedUserMessage) {
    return {
      ok: false,
      message: "Gagal menyimpan pesan. Silakan coba lagi.",
    };
  }

  const services = await getAssistantServices();

  const completion = await completeAssistantReply({
    history: [
      ...history.map((item) => ({
        role: item.role,
        content: item.message,
      })),
      { role: "user" as const, content: message },
    ],
    services,
    userRole: user.role,
  });

  if (!completion.ok) {
    return { ok: false, message: completion.error };
  }

  await insertAiMessage(user.id, "assistant", completion.message);

  revalidatePath(AI_PATH);

  return { ok: true, message: "Balasan diterima.", reply: completion.message };
}

export async function clearAiConversationAction(): Promise<AiActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: AUTH_ERROR };
  }

  const cleared = await clearAiHistory(user.id);

  if (!cleared) {
    return { ok: false, message: "Gagal menghapus riwayat percakapan." };
  }

  revalidatePath(AI_PATH);

  return { ok: true, message: "Riwayat percakapan dihapus." };
}
