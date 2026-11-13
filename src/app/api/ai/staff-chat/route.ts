import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  answerStaffQuestion,
  type StaffAgentRole,
} from "@/lib/ai/staff-agent";
import { checkStaffChatRateLimit } from "@/lib/ai/rate-limit";
import { aiMessageSchema } from "@/lib/validations/ai";

const AUTH_ERROR = "Sesi tidak valid. Silakan masuk kembali.";
const FORBIDDEN = "Halaman ini hanya untuk admin atau teknisi.";

/**
 * Chat AI staf (admin/teknisi) yang bisa membaca database operasional.
 *
 * Stateless seperti AI Copilot: riwayat percakapan dipegang client, server
 * hanya memproses satu pertanyaan. Agen hanya punya tool BACA — tidak ada
 * jalur yang bisa mengubah data. Batas peran ditegakkan di eksekutor tool
 * (lihat src/lib/ai/staff-agent.ts), bukan di prompt semata.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: AUTH_ERROR });
  }
  if (user.role !== "admin" && user.role !== "teknisi") {
    return NextResponse.json({ ok: false, message: FORBIDDEN });
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
  if (!parsed.success) {
    return NextResponse.json({
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Pesan tidak valid.",
    });
  }

  const limit = checkStaffChatRateLimit(user.id);
  if (!limit.ok) {
    return NextResponse.json({ ok: false, message: limit.error });
  }

  const answer = await answerStaffQuestion(
    user.role as StaffAgentRole,
    parsed.data.message,
  );
  if (!answer.ok) {
    return NextResponse.json({ ok: false, message: answer.error });
  }

  return NextResponse.json({ ok: true, reply: answer.reply });
}
