import "server-only";

import type { NotificationSender, SendResult } from "@/lib/notifications/types";

/**
 * Sender email. Belum ada provider yang dikonfigurasi pada MVP, jadi fungsi
 * ini selalu menolak dengan pesan jelas alih-alih diam-diam menandai baris
 * outbox sebagai terkirim.
 *
 * Mengisi RESEND_API_KEY dan RESEND_FROM mengaktifkannya tanpa perubahan kode
 * lain di aplikasi ini.
 */
export const emailSender: NotificationSender = {
  channel: "email",

  recipientFor(payload) {
    return payload.recipientEmail || null;
  },

  async send(payload): Promise<SendResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();

    if (!apiKey) {
      return {
        ok: false,
        error: "Email belum dikonfigurasi (RESEND_API_KEY kosong).",
      };
    }

    const from = process.env.RESEND_FROM?.trim();

    if (!from) {
      return {
        ok: false,
        error: "Email belum dikonfigurasi (RESEND_FROM kosong).",
      };
    }

    if (!payload.recipientEmail) {
      return { ok: false, error: "Penerima tidak punya alamat email." };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [payload.recipientEmail],
        subject: payload.title,
        text: `${payload.message}\n\n(${payload.event})`,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        error: `Resend menolak permintaan (${response.status}). ${detail.slice(0, 200)}`,
      };
    }

    return { ok: true };
  },
};