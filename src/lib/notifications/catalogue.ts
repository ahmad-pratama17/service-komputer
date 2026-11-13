import type { NotificationEvent } from "@/lib/notifications/types";

/**
 * Katalog event. Semua pesan notifikasi TAHAP 12 originates dari trigger
 * PostgreSQL, jadi teks Indonesianya hidup di migration 00007 — file ini
 * hanya city's label event untuk ditampilkan di UI admin atau log.
 */
export const NOTIFICATION_EVENT_LABEL: Record<NotificationEvent, string> = {
  "order.created": "Pesanan Baru",
  "order.status_changed": "Status Pesanan Berubah",
  "order.estimated_cost_changed": "Estimasi Biaya Berubah",
  "order.final_cost_changed": "Biaya Final Berubah",
  "invoice.issued": "Invoice Diterbitkan",
  "invoice.payment_status_changed": "Status Pembayaran Berubah",
  "invoice.paid": "Pembayaran Diterima",
};

export function isNotificationEvent(value: string): value is NotificationEvent {
  return value in NOTIFICATION_EVENT_LABEL;
}