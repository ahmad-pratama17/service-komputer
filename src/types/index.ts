export type UserRole = "customer" | "admin" | "teknisi";

export type ServiceCategory =
  | "computer_repair"
  | "network"
  | "software"
  | "it_support"
  | "data_recovery"
  | "maintenance";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "diagnosis"
  | "waiting_approval"
  | "in_progress"
  | "completed"
  | "paid"
  | "closed"
  | "cancelled";

/**
 * `partially_paid` masih ada karena nilainya sudah dipakai di database dan
 * PostgreSQL tidak bisa menghapus nilai enum. Pada MVP invoice tidak ada
 * pelacakan pembayaran parsial, jadi status ini disembunyikan dari UI lewat
 * MANUAL_PAYMENT_STATUSES.
 */
export type InvoicePaymentStatus =
  | "unpaid"
  | "pending"
  | "partially_paid"
  | "paid";

/** Cara pembayaran invoice: manual sekarang, payment gateway nanti. */
export type InvoicePaymentMethod = "manual" | "midtrans" | "xendit";

export type OrderPhotoType = "issue" | "result";

export type NotificationType = "order" | "invoice" | "payment" | "system";

export type AiRole = "user" | "assistant";

export type AppNavItem = {
  href: string;
  label: string;
  icon?: string;
};

export type AdminNavIcon =
  | "orders"
  | "customers"
  | "services"
  | "invoices"
  | "notifications"
  | "assistant";

export type AdminNavEntry = AppNavItem & {
  icon: AdminNavIcon;
};