import { z } from "zod";

export const MAX_CHAT_MESSAGE_LENGTH = 1000;
export const AI_HISTORY_LIMIT = 12;

export const aiMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Pesan tidak boleh kosong")
    .max(
      MAX_CHAT_MESSAGE_LENGTH,
      `Pesan maksimal ${MAX_CHAT_MESSAGE_LENGTH} karakter`,
    ),
});

export type AiMessageInput = z.infer<typeof aiMessageSchema>;
