import "server-only";

import type { NotificationSender, SendResult } from "@/lib/notifications/types";

/** Nomor harus E.164 tanpa "+": 62xxxxxxxxxx. */
function normalizePhone(phone: string | null | undefined): string | null {
  let digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return null;

  // Normalisasi nomor telepon format lokal (08... atau 8...) ke format internasional (628...)
  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith("8")) {
    digits = `62${digits}`;
  }

  return digits.length >= 10 ? digits : null;
}

type FonnteSendResponse = {
  status?: boolean;
  reason?: string;
  message?: string;
  detail?: string;
};

/**
 * Sender WhatsApp. Diaktifkan lewat WHATSAPP_TOKEN (Fonnte) dan
 * WHATSAPP_SENDER. Status pending di outbox tidak boleh dianggap terkirim
 * tanpa kredensial, jadi fungsi ini selalu menolak dengan pesan jelas.
 */
export const whatsappSender: NotificationSender = {
  channel: "whatsapp",

  recipientFor(payload) {
    return normalizePhone(payload.recipientPhone);
  },

  async send(payload): Promise<SendResult> {
    const token = process.env.WHATSAPP_TOKEN?.trim();
    const sender = process.env.WHATSAPP_SENDER?.trim();

    if (!token || !sender) {
      return {
        ok: false,
        error:
          "WhatsApp belum dikonfigurasi (WHATSAPP_TOKEN/WHATSAPP_SENDER kosong).",
      };
    }

    const target = normalizePhone(payload.recipientPhone);

    if (!target) {
      return {
        ok: false,
        error: "Penerima tidak punya nomor WhatsApp valid.",
      };
    }

    let response: Response;
    try {
      response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target,
          sender,
          message: `*${payload.title}*\n${payload.message}`,
        }),
      });
    } catch (networkError) {
      return {
        ok: false,
        error: `Gagal menghubungi API Fonnte: ${networkError instanceof Error ? networkError.message : "Network error"}`,
      };
    }

    // Fonnte mengembalikan JSON { status: boolean, reason?: string }.
    // Penting: Fonnte sering mengembalikan HTTP 200 meskipun gagal (misal "invalid token" atau "device disconnected").
    let data: FonnteSendResponse | null = null;
    try {
      data = (await response.json()) as FonnteSendResponse;
    } catch {
      // response bukan JSON valid
    }

    if (!response.ok || (data && data.status === false)) {
      const detail =
        data?.reason ||
        data?.message ||
        data?.detail ||
        `HTTP ${response.status}`;

      return {
        ok: false,
        error: `Fonnte menolak pengiriman (${detail}).`,
      };
    }

    return { ok: true };
  },
};