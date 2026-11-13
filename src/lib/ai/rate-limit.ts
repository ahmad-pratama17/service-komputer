import "server-only";

import type { PhotoStore } from "@/lib/order-photos";

/**
 * Rate limiting sederhana: batas jumlah pesan user per jendela waktu.
 * Menghitung baris di ai_conversations, yang sudah didukung index
 * (user_id, created_at) dari 00001. Tidak butuh infrastruktur tambahan.
 */

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_MESSAGES = 5;
export const RATE_LIMIT_MAX_CHARS_PER_WINDOW = 4000;

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number; error: string };

export async function checkAiRateLimit(
  supabase: PhotoStore,
  userId: string,
  incomingChars: number,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, message")
    .eq("user_id", userId)
    .eq("role", "user")
    .gte("created_at", since);

  if (error) {
    // Gagal menghitung bukan berarti customers diblokir.
    return { ok: true, remaining: RATE_LIMIT_MAX_MESSAGES };
  }

  const rows = data ?? [];

  if (rows.length >= RATE_LIMIT_MAX_MESSAGES) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      error: `Maksimal ${RATE_LIMIT_MAX_MESSAGES} pesan per menit. Tunggu sebentar sebelum mencoba lagi.`,
    };
  }

  const usedChars = rows.reduce((total, row) => total + row.message.length, 0);

  if (usedChars + incomingChars > RATE_LIMIT_MAX_CHARS_PER_WINDOW) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      error: "Jumlah karakter yang dikirim dalam waktu singkat terlalu banyak. Coba lagi sebentar lagi.",
    };
  }

  return {
    ok: true,
    remaining: RATE_LIMIT_MAX_MESSAGES - rows.length - 1,
  };
}

/**
 * Rate limit untuk AI Copilot admin. Beda dari rate limit chat: analisis tidak
 * menulis baris ke ai_conversations, jadi penghitungannya in-memory per proses
 * Node. Cukup untuk satu instance; untuk multi-instance atau serverless perlu
 * dipindahkan ke Redis atau tabel terpisah.
 */
export const ADMIN_ANALYSIS_MAX_PER_WINDOW = 6;

const ADMIN_ANALYSIS_WINDOW_MS = 5 * 60_000;
const adminAnalysisHits = new Map<string, number[]>();

export async function checkAdminAnalysisRateLimit(
  adminId: string,
): Promise<RateLimitResult> {
  const now = Date.now();
  const cutoff = now - ADMIN_ANALYSIS_WINDOW_MS;

  const recent = (adminAnalysisHits.get(adminId) ?? []).filter(
    (timestamp) => timestamp > cutoff,
  );

  if (recent.length >= ADMIN_ANALYSIS_MAX_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil(
      (Math.max(recent[0], cutoff) + ADMIN_ANALYSIS_WINDOW_MS - now) / 1000,
    );
    return {
      ok: false,
      retryAfterSeconds,
      error: `Batas ${ADMIN_ANALYSIS_MAX_PER_WINDOW} analisis AI per 5 menit tercapai. Tunggu sebentar sebelum mencoba lagi.`,
    };
  }

  recent.push(now);
  adminAnalysisHits.set(adminId, recent);

  // Pembersihan berkala agar Map tidak tumbuh tanpa batas.
  if (adminAnalysisHits.size > 500) {
    for (const [key, timestamps] of adminAnalysisHits) {
      if (timestamps.every((timestamp) => timestamp <= cutoff)) {
        adminAnalysisHits.delete(key);
      }
    }
  }

  return { ok: true, remaining: ADMIN_ANALYSIS_MAX_PER_WINDOW - recent.length };
}

/**
 * Rate limit chat AI staf (admin/teknisi). Satu pertanyaan bisa memicu
 * beberapa pemanggilan model (loop agen), jadi yang dihitung pertanyaannya,
 * bukan pemanggilan modelnya. In-memory seperti analisis copilot: cukup
 * untuk satu instance.
 */
export const STAFF_CHAT_MAX_PER_WINDOW = 8;

const STAFF_CHAT_WINDOW_MS = 5 * 60_000;
const staffChatHits = new Map<string, number[]>();

export function checkStaffChatRateLimit(userId: string): RateLimitResult {
  const now = Date.now();
  const cutoff = now - STAFF_CHAT_WINDOW_MS;

  const recent = (staffChatHits.get(userId) ?? []).filter(
    (timestamp) => timestamp > cutoff,
  );

  if (recent.length >= STAFF_CHAT_MAX_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil(
      (Math.max(recent[0], cutoff) + STAFF_CHAT_WINDOW_MS - now) / 1000,
    );
    return {
      ok: false,
      retryAfterSeconds,
      error: `Batas ${STAFF_CHAT_MAX_PER_WINDOW} pertanyaan AI per 5 menit tercapai. Tunggu sebentar sebelum mencoba lagi.`,
    };
  }

  recent.push(now);
  staffChatHits.set(userId, recent);

  if (staffChatHits.size > 500) {
    for (const [key, timestamps] of staffChatHits) {
      if (timestamps.every((timestamp) => timestamp <= cutoff)) {
        staffChatHits.delete(key);
      }
    }
  }

  return { ok: true, remaining: STAFF_CHAT_MAX_PER_WINDOW - recent.length };
}
