import "server-only";

import {
  activeChannels,
  APP_NOTIFICATION_SENDERS,
  type NotificationChannelName,
} from "@/lib/notifications/channels";
import {
  createServiceRoleClient,
  hasServiceRoleKey,
} from "@/lib/supabase/admin";
import { isNotificationEvent } from "@/lib/notifications/catalogue";
import type { DrainSummary } from "@/lib/notifications/types";
import {
  isAppNotificationChannel,
  type NotificationPayload,
  type PendingOutboxRow,
} from "@/lib/notifications/types";

/** Batas percobaan sebelum baris dianggap gagal permanen. */
const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 50;

type ProfileRow = {
  email: string;
  phone: string | null;
};

type OutboxClient = ReturnType<typeof createServiceRoleClient>;

/**
 * Mengirim satu notifikasi ke satu kanal.
 *
 * Setiap baris outbox hanya dikirim ke satu kanal. Kalau fungsi ini mengirim ke
 * semua kanal aktif, baris `channel = email` dan baris `channel = whatsapp`
 * akan mengirim pesan yang sama dua kali.
 */
export async function deliverNotification(
  payload: NotificationPayload,
  channel: NotificationChannelName,
): Promise<{ delivered: boolean; error: string | null }> {
  const sender = APP_NOTIFICATION_SENDERS.find(
    (candidate) => candidate.channel === channel,
  );

  if (!sender) {
    return { delivered: false, error: "Sender tidak terdaftar." };
  }

  if (!sender.recipientFor(payload)) {
    return {
      delivered: false,
      error: "Penerima tidak punya alamat untuk kanal ini.",
    };
  }

  const result = await sender.send(payload);

  return result.ok
    ? { delivered: true, error: null }
    : { delivered: false, error: result.error };
}

/**
 * Mengirim satu notifikasi ke beberapa kanal sekaligus.
 *
 * Kegagalan per kanal tidak menghentikan kanal lain: satu email yang gagal
 * tidak boleh membuat WhatsApp ikut gagal.
 */
export async function deliverNotificationToAll(
  payload: NotificationPayload,
  channels: NotificationChannelName[],
): Promise<{ delivered: string[]; failed: Record<string, string> }> {
  const results = await Promise.all(
    channels.map(async (channel) => ({
      channel,
      result: await deliverNotification(payload, channel),
    })),
  );

  const delivered: string[] = [];
  const failed: Record<string, string> = {};

  for (const { channel, result } of results) {
    if (result.delivered) {
      delivered.push(channel);
    } else if (result.error) {
      failed[channel] = result.error;
    }
  }

  return { delivered, failed };
}

/**
 * Mengirim satu notifikasi ke semua kanal yang punya kredensial.
 *
 * Baris tanpa kredensial sengaja dibiarkan `pending` dan tidak dihitung
 * sebagai kegagalan, supaya ketika provider-nya nanti dipasang, notifikasi
 * lama masih bisa dikirim dan tidak hilang.
 *
 * Memakai service-role client: RLS `notification_outbox` hanya mengizinkan
 * admin membaca, dan tidak mengizinkan update sama sekali. Dengan anon key
 * biasa pemrosesan antrean akan selalu ditolak RLS.
 */
export async function drainPendingNotifications(
  channels?: NotificationChannelName[],
): Promise<DrainSummary> {
  const summary: DrainSummary = {
    checked: 0,
    delivered: 0,
    failed: 0,
    skipped: 0,
  };

  if (!hasServiceRoleKey()) {
    return summary;
  }

  const available = activeChannels();
  const targets = channels
    ? channels.filter((channel) => available.includes(channel))
    : available;

  if (targets.length === 0) {
    return summary;
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("notification_outbox")
    .select(
      "id, user_id, event, channel, title, message, type, attempts",
    )
    .in("channel", targets)
    .eq("status", "pending")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error || !data || data.length === 0) {
    return summary;
  }

  const rows = data as PendingOutboxRow[];
  summary.checked = rows.length;

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const profiles = await loadProfiles(supabase, userIds);

  for (const row of rows) {
    const profile = profiles.get(row.user_id);

    if (!profile) {
      const attempts = row.attempts + 1;
      await markRow(
        supabase,
        row.id,
        attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        "Profil penerima tidak ditemukan.",
        attempts,
      );
      summary.failed += 1;
      continue;
    }

    if (!isAppNotificationChannel(row.channel)) {
      // Hanya in_app yang tidak lewat aplikasi. Kanal tak dikenal ditahan
      // supaya tidak hilang dan bisa dikirim setelah versi berikutnya terbit.
      await markRow(
        supabase,
        row.id,
        "pending",
        `Kanal tidak dikenal: ${row.channel}`,
      );
      summary.skipped += 1;
      continue;
    }

    if (!isNotificationEvent(row.event)) {
      // Event dari migrasi yang lebih baru mungkin belum dikenal versi ini.
      await markRow(
        supabase,
        row.id,
        "pending",
        `Event tidak dikenal: ${row.event}`,
      );
      summary.skipped += 1;
      continue;
    }

    const payload: NotificationPayload = {
      event: row.event,
      userId: row.user_id,
      recipientEmail: profile.email,
      recipientPhone: profile.phone,
      title: row.title,
      message: row.message,
      type: row.type,
    };

    const result = await deliverNotification(payload, row.channel);

    if (result.delivered) {
      await markRow(supabase, row.id, "delivered", null);
      summary.delivered += 1;
    } else {
      const attempts = row.attempts + 1;
      await markRow(
        supabase,
        row.id,
        attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        result.error,
        attempts,
      );
      summary.failed += 1;
    }
  }

  return summary;
}

async function loadProfiles(
  supabase: OutboxClient,
  userIds: string[],
): Promise<Map<string, ProfileRow>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, email, phone")
    .in("id", userIds);

  return new Map(
    (data ?? []).map((row) => [
      row.id,
      { email: row.email, phone: row.phone } satisfies ProfileRow,
    ]),
  );
}

async function markRow(
  supabase: OutboxClient,
  id: string,
  status: "pending" | "delivered" | "failed",
  error: string | null,
  attempts?: number,
): Promise<void> {
  const patch: {
    status: string;
    last_error: string | null;
    delivered_at: string | null;
    attempts?: number;
  } = {
    status,
    last_error: error,
    delivered_at: status === "delivered" ? new Date().toISOString() : null,
  };

  if (attempts !== undefined) {
    patch.attempts = attempts;
  }

  await supabase.from("notification_outbox").update(patch).eq("id", id);
}