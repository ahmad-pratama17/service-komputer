import "server-only";

import { randomUUID } from "node:crypto";
import type {
  InvoicePaymentStatus,
  NotificationType,
  OrderStatus,
} from "@/types";
import {
  hashPassword,
  loadDb,
  saveDb,
  type DemoDb,
  type DemoUser,
} from "@/lib/demo/store";

/**
 * Semua penulisan mode demo. Setiap fungsi menyimpan langsung ke
 * `data/demo-db.json`, jadi data bertahan antar restart dev server.
 */

function nowIso(): string {
  return new Date().toISOString();
}

export function demoNotify(
  db: DemoDb,
  userId: string,
  title: string,
  message: string,
  type: NotificationType,
): void {
  db.notifications.push({
    id: `demo-notif-${randomUUID()}`,
    user_id: userId,
    title,
    message,
    type,
    is_read: false,
    created_at: nowIso(),
  });
}

export function demoNotifyAdmins(
  db: DemoDb,
  title: string,
  message: string,
  type: NotificationType,
): void {
  // Notifikasi operasional masuk ke seluruh staf: admin dan teknisi.
  for (const user of db.users.filter(
    (row) => row.role === "admin" || row.role === "teknisi",
  )) {
    demoNotify(db, user.id, title, message, type);
  }
}

export function demoAddHistory(
  db: DemoDb,
  orderId: string,
  oldStatus: OrderStatus | null,
  newStatus: OrderStatus,
  note: string | null,
  changedBy: string | null,
): void {
  db.history.push({
    id: `demo-hist-${randomUUID()}`,
    order_id: orderId,
    old_status: oldStatus,
    new_status: newStatus,
    note,
    changed_by: changedBy,
    created_at: nowIso(),
  });
}

export function demoBuildOrderNumber(date = new Date()): string {
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `SRV-${ymd}-${suffix}`;
}

/** Pengguna baru dari form registrasi. Email harus unik. */
export function demoCreateUser(input: {
  email: string;
  name: string;
  phone: string | null;
  password: string;
}): { ok: true; user: DemoUser } | { ok: false; error: string } {
  const db = loadDb();
  const email = input.email.trim().toLowerCase();
  if (db.users.some((row) => row.email.toLowerCase() === email)) {
    return { ok: false, error: "Email sudah terdaftar. Silakan masuk." };
  }
  const { salt, hash } = hashPassword(input.password);
  const user: DemoUser = {
    id: `demo-user-${randomUUID()}`,
    email,
    name: input.name.trim(),
    phone: input.phone,
    role: "customer",
    password_salt: salt,
    password_hash: hash,
    created_at: nowIso(),
  };
  db.users.push(user);
  saveDb(db);
  return { ok: true, user };
}

export function demoUpdateProfile(
  userId: string,
  input: { name: string; phone: string | null },
): boolean {
  const db = loadDb();
  const user = db.users.find((row) => row.id === userId);
  if (!user) {
    return false;
  }
  user.name = input.name.trim();
  user.phone = input.phone;
  saveDb(db);
  return true;
}

export function demoMarkNotificationRead(
  userId: string,
  notificationId: string,
): void {
  const db = loadDb();
  const row = db.notifications.find(
    (item) => item.id === notificationId && item.user_id === userId,
  );
  if (row) {
    row.is_read = true;
    saveDb(db);
  }
}

export function demoMarkAllNotificationsRead(userId: string): void {
  const db = loadDb();
  let changed = false;
  for (const row of db.notifications) {
    if (row.user_id === userId && !row.is_read) {
      row.is_read = true;
      changed = true;
    }
  }
  if (changed) {
    saveDb(db);
  }
}

export function demoAppendChatMessage(
  userId: string,
  role: "user" | "assistant",
  message: string,
): void {
  const db = loadDb();
  const list = (db.conversations[userId] ??= []);
  list.push({
    id: `demo-msg-${randomUUID()}`,
    role,
    message,
    created_at: nowIso(),
  });
  saveDb(db);
}

export function demoClearChat(userId: string): void {
  const db = loadDb();
  db.conversations[userId] = [];
  saveDb(db);
}

/** Rate limit demo: maksimal 5 pesan/menit, dihitung dari store lokal. */
export function demoCheckChatRateLimit(
  userId: string,
  incomingChars: number,
): { ok: true } | { ok: false; error: string } {
  const db = loadDb();
  const since = Date.now() - 60_000;
  const recent = (db.conversations[userId] ?? []).filter(
    (row) => row.role === "user" && Date.parse(row.created_at) >= since,
  );
  if (recent.length >= 5) {
    return {
      ok: false,
      error: "Maksimal 5 pesan per menit. Tunggu sebentar sebelum mencoba lagi.",
    };
  }
  const used = recent.reduce((total, row) => total + row.message.length, 0);
  if (used + incomingChars > 4000) {
    return {
      ok: false,
      error:
        "Jumlah karakter yang dikirim dalam waktu singkat terlalu banyak. Coba lagi sebentar lagi.",
    };
  }
  return { ok: true };
}

export function demoBuildInvoiceNumber(date = new Date()): string {
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `INV-${ymd}-${suffix}`;
}

export function demoSetInvoicePayment(
  invoiceId: string,
  status: InvoicePaymentStatus,
): { ok: true; orderId: string } | { ok: false } {
  const db = loadDb();
  const invoice = db.invoices.find((row) => row.id === invoiceId);
  if (!invoice || invoice.payment_status === status) {
    return { ok: false };
  }
  invoice.payment_status = status;
  invoice.paid_at = status === "paid" ? nowIso() : null;
  demoNotifyAdmins(
    db,
    "Status Pembayaran",
    `Status pembayaran invoice ${invoice.invoice_number} berubah.`,
    "payment",
  );
  const order = db.orders.find((row) => row.id === invoice.order_id);
  if (order) {
    demoNotify(
      db,
      order.customer_id,
      "Status Pembayaran",
      `Status pembayaran invoice ${invoice.invoice_number} telah diperbarui.`,
      "payment",
    );
  }
  saveDb(db);
  return { ok: true, orderId: invoice.order_id };
}
