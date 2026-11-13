import { NextResponse, type NextRequest } from "next/server";
import { drainPendingNotifications } from "@/lib/notifications/dispatch";

/**
 * Penjadwal antrean notifikasi email/WhatsApp.
 *
 * Dipanggil oleh Task Scheduler Windows tiap 5 menit (lihat README bagian
 * notifikasi WhatsApp). Diamankan CRON_SECRET supaya tidak bisa dipicu
 * sembarang orang: tanpa secret yang cocok, selalu 401.
 *
 * Contoh pemanggilan:
 *   GET /api/cron/dispatch?secret=...isi-CRON_SECRET...
 */
export async function GET(request: NextRequest) {
  const configured = process.env.CRON_SECRET?.trim();

  if (!configured) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "CRON_SECRET belum diisi di .env.local. Antrean hanya bisa diproses lewat tombol manual di halaman Notifikasi admin.",
      },
      { status: 503 },
    );
  }

  const params = request.nextUrl.searchParams;
  const provided =
    params.get("secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!provided || provided !== configured) {
    return NextResponse.json(
      { ok: false, message: "Tidak berhak memicu penjadwal." },
      { status: 401 },
    );
  }

  const summary = await drainPendingNotifications();

  return NextResponse.json({ ok: true, summary });
}
