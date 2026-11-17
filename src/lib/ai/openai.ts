import "server-only";

import { AI_SYSTEM_INSTRUCTION, buildAssistantContext } from "@/lib/ai/prompt";
import type { ServiceContextItem } from "@/lib/ai/prompt";
import { chatCompletion, isAiConfigured } from "@/lib/ai/provider";

const MAX_OUTPUT_TOKENS = 1200;

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export { isAiConfigured };

/**
 * Satu putaran percakapan. `history` berisi pesan yang sudah tersimpan
 * (tanpa pesan terbaru) dan dikirim apa adanya sebagai konteks percakapan.
 * Model tidak diberi tool apa pun sehingga tidak bisa menyentuh database.
 *
 * `userRole` digunakan untuk menyesuaikan jawaban sesuai hirarki:
 * - customer: konsultasi perbaikan, estimasi layanan, panduan first-aid
 * - admin: operasional bisnis, keuangan, manajemen pelanggan
 * - teknisi: antrean pesanan, diagnosa, layanan teknis
 */
export async function completeAssistantReply({
  history,
  services,
  userRole,
}: {
  history: ChatTurn[];
  services: ServiceContextItem[];
  userRole?: string;
}): Promise<ChatResult> {
  const roleLine = userRole
    ? `\n\nPERAN PENGGUNA: ${userRole}. Sesuaikan jawaban dengan wewenang dan tanggung jawab peran ini. Jangan memberikan informasi atau saksi di luar wewenang peran tersebut.`
    : "";

  const result = await chatCompletion({
    messages: [
      {
        role: "system",
        content: `${AI_SYSTEM_INSTRUCTION}${roleLine}\n\n${buildAssistantContext(services)}`,
      },
      ...history.map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
    ],
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });

  return result.ok
    ? { ok: true, message: result.content }
    : { ok: false, error: result.error };
}