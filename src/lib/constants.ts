import type { BadgeProps } from "@/components/ui/badge";
import type {
  InvoicePaymentStatus,
  NotificationType,
  OrderStatus,
  ServiceCategory,
} from "@/types";

export const APP_NAME = "ServiceKomputer";
export const APP_TAGLINE = "Computer & IT Services";
export const APP_DESCRIPTION =
  "Layanan perbaikan komputer, laptop, jaringan, instalasi software, dan dukungan IT dengan tracking status secara online.";

export const CONTACT = {
  phone: "+62 812-3456-7890",
  whatsapp: "6281234567890",
  email: "halo@servicekomputer.id",
  address: "Jl. Teknologi No. 123, Jakarta, Indonesia",
  hours: "Senin – Sabtu, 08.00 – 20.00 WIB",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Menunggu Diterima",
  accepted: "Diterima",
  diagnosis: "Diagnosa",
  waiting_approval: "Menunggu Persetujuan",
  in_progress: "Dalam Pengerjaan",
  completed: "Selesai",
  paid: "Dibayar",
  closed: "Selesai / Ditutup",
  cancelled: "Dibatalkan",
};

export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  "pending",
  "accepted",
  "diagnosis",
  "waiting_approval",
  "in_progress",
  "completed",
  "paid",
  "closed",
  "cancelled",
];

export const SERVICE_CATEGORY_LABEL: Record<ServiceCategory, string> = {
  computer_repair: "Perbaikan Komputer",
  network: "Jaringan & Internet",
  software: "Instalasi & Software",
  it_support: "IT Support",
  data_recovery: "Penyelamatan Data",
  maintenance: "Perawatan Berkala",
};

export const PAYMENT_STATUS_LABEL: Record<InvoicePaymentStatus, string> = {
  unpaid: "Belum Dibayar",
  pending: "Menunggu Verifikasi",
  partially_paid: "Dibayar Sebagian",
  paid: "Lunas",
};

/**
 * Status pembayaran yang dipakai UI MVP: unpaid | pending | paid.
 * `partially_paid` sengaja tidak offer karena belum ada pelacakan pembayaran
 * parsial; nilainya masih dibaca untuk baris lama hasil migrasi.
 */
export const MANUAL_PAYMENT_STATUSES: InvoicePaymentStatus[] = [
  "unpaid",
  "pending",
  "paid",
];

export const PAYMENT_STATUS_VARIANT: Record<
  InvoicePaymentStatus,
  BadgeProps["variant"]
> = {
  unpaid: "danger",
  pending: "warning",
  partially_paid: "warning",
  paid: "success",
};

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  order: "Pesanan",
  invoice: "Tagihan",
  payment: "Pembayaran",
  system: "Sistem",
};

export const ORDER_PHOTO_BUCKET = "service-order-photos";
export const MAX_ORDER_PHOTOS = 4;
export const MAX_ORDER_PHOTO_BYTES = 4 * 1024 * 1024;
export const ORDER_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export type CustomerNavItem = {
  href: string;
  label: string;
  icon: string;
};

export const CUSTOMER_NAV: CustomerNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { href: "/dashboard/services", label: "Pesanan Service", icon: "clipboard-list" },
  { href: "/dashboard/invoices", label: "Tagihan", icon: "credit-card" },
  { href: "/dashboard/notifications", label: "Notifikasi", icon: "bell" },
  { href: "/dashboard/profile", label: "Profil", icon: "user" },
];
