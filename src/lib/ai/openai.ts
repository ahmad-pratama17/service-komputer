import "server-only";

import { AI_SYSTEM_INSTRUCTION, buildAssistantContext } from "@/lib/ai/prompt";
import type { ServiceContextItem } from "@/lib/ai/prompt";
import { chatCompletion, isAiConfigured } from "@/lib/ai/provider";

const MAX_OUTPUT_TOKENS = 700;

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
 */
export async function completeAssistantReply({
  history,
  services,
}: {
  history: ChatTurn[];
  services: ServiceContextItem[];
}): Promise<ChatResult> {
  const result = await chatCompletion({
    messages: [
      {
        role: "system",
        content: `${AI_SYSTEM_INSTRUCTION}\n\n${buildAssistantContext(services)}`,
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