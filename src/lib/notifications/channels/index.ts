import type {
  AppNotificationChannel,
  NotificationSender,
} from "@/lib/notifications/types";
import { emailSender } from "@/lib/notifications/channels/email";
import { whatsappSender } from "@/lib/notifications/channels/whatsapp";

export type { AppNotificationChannel as NotificationChannelName };

/**
 * Daftar kanal yang diurus aplikasi. 'in_app' sengaja tidak ada di sini karena
 *urisinya sudah ditangani trigger database.
 *
 * Menambah kanal baru cukup menambah file di folder ini lalu mendaftarkannya
 * di sini.
 */
export const APP_NOTIFICATION_SENDERS: NotificationSender[] = [
  emailSender,
  whatsappSender,
];

/**
 * Kanal yang punya kredensial dan boleh mencoba mengirim.
 *
 * Baris outbox untuk kanal tanpa kredensial tidak ikut diproses supaya
 * `attempts`-nya tidak naik dan notifikasi lama tetap terkirim begitu
 * provider-nya dipasang.
 */
export function activeChannels(): AppNotificationChannel[] {
  const names: AppNotificationChannel[] = [];

  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM) {
    names.push("email");
  }

  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_SENDER) {
    names.push("whatsapp");
  }

  return names;
}