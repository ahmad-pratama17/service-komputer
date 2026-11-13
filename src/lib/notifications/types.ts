import type { NotificationType } from "@/types";

/**
 * Kanal pengiriman notifikasi. 'in_app' ditangani trigger database sehingga
 * selalu terkirim; kanal lain butuh aplikasi karena trigger PostgreSQL tidak
 * bisa memanggil HTTP API.
 */
export type NotificationChannel = "in_app" | "email" | "whatsapp";

/**
 * Kunci event notifikasi. Dipakai sebagai penanda pada outbox sehingga
 * kanal email/WhatsApp bisa bereaksi berbeda per event tanpa mem-parse teks
 * notifikasi.
 */
export type NotificationEvent =
  | "order.created"
  | "order.status_changed"
  | "order.estimated_cost_changed"
  | "order.final_cost_changed"
  | "invoice.issued"
  | "invoice.payment_status_changed"
  | "invoice.paid";

export type NotificationPayload = {
  event: NotificationEvent;
  userId: string;
  recipientEmail: string;
  recipientPhone: string | null;
  title: string;
  message: string;
  type: NotificationType;
};

/** Bentuk notifikasi yang dibutuhkan dropdown lonceng. */
export type NotificationPreview = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
};

export type SendResult =
  | { ok: true }
  | { ok: false; error: string };

export type AppNotificationChannel = Exclude<
  NotificationChannel,
  "in_app"
>;

/** Menyempitkan string dari database menjadi kanal yang dikenal aplikasi. */
export function isAppNotificationChannel(
  value: string,
): value is AppNotificationChannel {
  return value === "email" || value === "whatsapp";
}

/**
 * Kontrak satu kanal. Menambah email atau WhatsApp berarti membuat file baru
 * yang mengimplementasikan interface ini lalu mendaftarkannya di
 * ./channels/index.ts — tidak ada bagian lain yang perlu berubah.
 */
export type NotificationSender = {
  channel: AppNotificationChannel;
  /** Alamat kanal tujuan, mis. alamat email atau nomor E.164. */
  recipientFor(payload: NotificationPayload): string | null;
  send(payload: NotificationPayload): Promise<SendResult>;
};

/** Baris outbox yang masih harus dikirim aplikasi. */
export type PendingOutboxRow = {
  id: string;
  user_id: string;
  event: string;
  channel: string;
  title: string;
  message: string;
  type: NotificationType;
  attempts: number;
};

export type DrainSummary = {
  checked: number;
  delivered: number;
  failed: number;
  skipped: number;
};