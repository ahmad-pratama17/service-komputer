import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  clearAiHistory,
  getAiHistory,
  insertAiMessage,
} from "@/lib/ai/conversations";
import { getAssistantServices } from "@/lib/ai/services";
import { completeAssistantReply, isAiConfigured } from "@/lib/ai/openai";
import { checkAiRateLimit } from "@/lib/ai/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { aiMessageSchema } from "@/lib/validations/ai";
import { isDemoMode } from "@/lib/demo/mode";
import { demoAssistantReply } from "@/lib/demo/assistant";
import {
  demoAppendChatMessage,
  demoCheckChatRateLimit,
  demoClearChat,
} from "@/lib/demo/mutations";

const AUTH_ERROR = "Sesi tidak valid. Silakan masuk kembali.";
const AI_DISABLED = "AI Assistant belum dikonfigurasi. Silakan hubungi admin.";

/**
 * Pengiriman pesan chat via JSON biasa, bukan form action.
 *
 * Alasan: form action (`useActionState`) bergantung pada ID action yang
 * disuntikkan ke HTML saat render. Tab basi yang dibuka lintas restart
 * server memegang ID mati sehingga klik Kirim tidak pernah sampai — tanpa
 * error apa pun di layar. Endpoint ini beralamat stabil (`/api/ai/chat`)
 * sehingga kebal terhadap masalah itu. Logika bisnisnya sama persis dengan
 * `sendAiMessageAction`: validasi → rate limit → simpan → panggil AI →
 * simpan balasan.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: AUTH_ERROR });
  }

  return NextResponse.json({
    ok: true,
    aiEnabled: isDemoMode() || isAiConfigured(),
    messages: await getAiHistory(user.id),
  });
};

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: AUTH_ERROR });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Pesan tidak valid." });
  }

  const parsed = aiMessageSchema.safeParse({
    message:
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>).message
        : undefined,
  });

  // Aksi hapus riwayat tidak butuh pesan.
  if (
    typeof body === "object" &&
    body !== null &&
    (body as Record<string, unknown>).action === "clear"
  ) {
    if (isDemoMode()) {
      demoClearChat(user.id);
    } else {
      const cleared = await clearAiHistory(user.id);
      if (!cleared) {
        return NextResponse.json({
          ok: false,
          message: "Gagal menghapus riwayat percakapan.",
        });
      }
    }
    return NextResponse.json({
      ok: true,
      message: "Riwayat percakapan dihapus.",
    });
  }

  if (!parsed.success) {
    return NextResponse.json({
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Pesan tidak valid.",
    });
  }

  const message = parsed.data.message;

  // Mode demo: tanpa API key. Jawaban aturan lokal, riwayat di store lokal.
  if (isDemoMode()) {
    const demoLimit = demoCheckChatRateLimit(user.id, message.length);
    if (!demoLimit.ok) {
      return NextResponse.json({ ok: false, message: demoLimit.error });
    }
    demoAppendChatMessage(user.id, "user", message);
    const services = await getAssistantServices();
    const reply = demoAssistantReply(message, services);
    demoAppendChatMessage(user.id, "assistant", reply);
    return NextResponse.json({
      ok: true,
      message: "Balasan diterima.",
      reply,
    });
  }

  if (!isAiConfigured()) {
    return NextResponse.json({ ok: false, message: AI_DISABLED });
  }

  const supabase = await createClient();
  const limit = await checkAiRateLimit(supabase, user.id, message.length);
  if (!limit.ok) {
    return NextResponse.json({ ok: false, message: limit.error });
  }

  const history = await getAiHistory(user.id);

  const savedUserMessage = await insertAiMessage(user.id, "user", message);
  if (!savedUserMessage) {
    return NextResponse.json({
      ok: false,
      message: "Gagal menyimpan pesan. Silakan coba lagi.",
    });
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
  });

  if (!completion.ok) {
    return NextResponse.json({ ok: false, message: completion.error });
  }

  await insertAiMessage(user.id, "assistant", completion.message);

  return NextResponse.json({
    ok: true,
    message: "Balasan diterima.",
    reply: completion.message,
  });
}
