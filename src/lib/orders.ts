import "server-only";

import { createClient } from "@/lib/supabase/server";
import { ORDER_PHOTO_BUCKET } from "@/lib/constants";
import { isDemoMode } from "@/lib/demo/mode";
import {
  demoCustomerDashboard,
  demoCustomerInvoice,
  demoCustomerInvoices,
  demoCustomerNotifications,
  demoCustomerOrderDetail,
  demoCustomerOrders,
  demoUnreadCount,
} from "@/lib/demo/queries";
import type { PhotoStore } from "@/lib/order-photos";
import type {
  InvoicePaymentMethod,
  InvoicePaymentStatus,
  NotificationType,
  OrderStatus,
} from "@/types";

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const PHOTO_URL_TTL_SECONDS = 60 * 60;

export type CustomerOrder = {
  id: string;
  order_number: string;
  service_id: string | null;
  service_name: string | null;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  problem_description: string;
  address: string | null;
  preferred_schedule: string | null;
  additional_notes: string | null;
  status: OrderStatus;
  diagnosis: string | null;
  estimated_cost: number | null;
  final_cost: number | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderPhoto = {
  id: string;
  fileName: string;
  url: string | null;
};

export type OrderHistoryItem = {
  id: string;
  order_id: string;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  note: string | null;
  changed_by: string | null;
  created_at: string;
};

export type CustomerInvoice = {
  id: string;
  order_id: string;
  order_number: string;
  service_name: string | null;
  invoice_number: string;
  description: string;
  subtotal: number;
  total: number;
  payment_status: InvoicePaymentStatus;
  payment_method: InvoicePaymentMethod;
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
};

export type CustomerNotification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
};

export type CustomerOrderDetail = {
  order: CustomerOrder;
  history: OrderHistoryItem[];
  invoice: CustomerInvoice | null;
  photos: OrderPhoto[];
  resultPhotos: OrderPhoto[];
};

export type DashboardData = {
  orders: CustomerOrder[];
  recentOrders: CustomerOrder[];
  notifications: CustomerNotification[];
  totals: {
    total: number;
    active: number;
    completed: number;
    unpaidInvoices: number;
  };
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const ACTIVE_STATUSES: OrderStatus[] = [
  "pending",
  "accepted",
  "diagnosis",
  "waiting_approval",
  "in_progress",
];

const COMPLETED_STATUSES: OrderStatus[] = ["completed", "paid", "closed"];

// 'pending' ikut dihitung belum lunas: customer sudah transfer tapi admin
// belum verifikasi, jadi uangnya belum dianggap masuk.
const UNPAID_STATUSES: InvoicePaymentStatus[] = [
  "unpaid",
  "pending",
  "partially_paid",
];

const INVOICE_COLUMNS =
  "id, order_id, invoice_number, description, subtotal, total, payment_status, payment_method, issued_at, due_at, paid_at";

type InvoiceRow = {
  id: string;
  order_id: string;
  invoice_number: string;
  description: string;
  subtotal: number;
  total: number;
  payment_status: InvoicePaymentStatus;
  payment_method: InvoicePaymentMethod;
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
};

const GENERIC_ERROR = "Gagal memuat data. Silakan coba lagi.";

async function getServiceNameMap(): Promise<Map<string, string>> {
  if (!hasSupabaseEnv) {
    return new Map();
  }
  const supabase = await createClient();
  const { data } = await supabase.from("services").select("id, name");
  return new Map((data ?? []).map((service) => [service.id, service.name]));
}

function toCustomerOrder(
  row: {
    id: string;
    order_number: string;
    service_id: string | null;
    device_type: string;
    device_brand: string | null;
    device_model: string | null;
    problem_description: string;
    address: string | null;
    preferred_schedule: string | null;
    additional_notes: string | null;
    status: OrderStatus;
    diagnosis: string | null;
    estimated_cost: number | null;
    final_cost: number | null;
    admin_notes: string | null;
    created_at: string;
    updated_at: string;
  },
  serviceNames: Map<string, string>,
): CustomerOrder {
  return {
    ...row,
    // Catatan internal tidak boleh sampai ke browser customer dalam bentuk
    // apa pun, termasuk flight payload. Query masih select("*"), jadi
    // dikosongkan di sini sampai query dipersempit kolomnya.
    admin_notes: null,
    service_name: row.service_id ? (serviceNames.get(row.service_id) ?? null) : null,
  };
}

/**
 * Nomor pesanan dan nama layanan disimpan di order, bukan di invoice, jadi
 * keduanya selalu ikut berubah kalau pesanan diperbarui.
 */
function toCustomerInvoice(
  row: InvoiceRow,
  order: { order_number: string; service_id: string | null },
  serviceNames: Map<string, string>,
): CustomerInvoice {
  return {
    ...row,
    order_number: order.order_number,
    service_name: order.service_id
      ? (serviceNames.get(order.service_id) ?? null)
      : null,
  };
}

export async function getCustomerOrders(
  userId: string,
): Promise<Result<CustomerOrder[]>> {
  if (isDemoMode()) {
    return { ok: true, data: demoCustomerOrders(userId) };
  }

  if (!hasSupabaseEnv) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const serviceNames = await getServiceNameMap();

  const { data, error } = await supabase
    .from("service_orders")
    .select("*")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: GENERIC_ERROR };
  }

  return { ok: true, data: data.map((row) => toCustomerOrder(row, serviceNames)) };
}

export async function getCustomerOrderDetail(
  userId: string,
  orderId: string,
): Promise<Result<CustomerOrderDetail | null>> {
  if (isDemoMode()) {
    return { ok: true, data: demoCustomerOrderDetail(userId, orderId) };
  }

  if (!hasSupabaseEnv) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const serviceNames = await getServiceNameMap();

  const { data: order, error: orderError } = await supabase
    .from("service_orders")
    .select("*")
    .eq("id", orderId)
    .eq("customer_id", userId)
    .maybeSingle();

  if (orderError) {
    return { ok: false, error: GENERIC_ERROR };
  }

  if (!order) {
    return { ok: true, data: null };
  }

  const [historyResult, invoiceResult, photosResult] = await Promise.all([
    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("invoices")
      .select(INVOICE_COLUMNS)
      .eq("order_id", orderId)
      .maybeSingle(),
    supabase
      .from("service_order_photos")
      .select("id, storage_path, file_name, photo_type")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
  ]);

  if (historyResult.error) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const photoRows = photosResult.data ?? [];
  const signedUrls = await Promise.all(
    photoRows.map((row) =>
      supabase.storage
        .from(ORDER_PHOTO_BUCKET)
        .createSignedUrl(row.storage_path, PHOTO_URL_TTL_SECONDS),
    ),
  );

  const toPhoto = (index: number) => ({
    id: photoRows[index].id,
    fileName: photoRows[index].file_name,
    url: signedUrls[index]?.data?.signedUrl ?? null,
  });

  return {
    ok: true,
    data: {
      order: toCustomerOrder(order, serviceNames),
      history: (historyResult.data ?? []).map((row) => ({
        id: row.id,
        order_id: row.order_id,
        old_status: row.old_status,
        new_status: row.new_status,
        note: row.note,
        changed_by: row.changed_by,
        created_at: row.created_at,
      })),
      invoice: invoiceResult.error || !invoiceResult.data
        ? null
        : toCustomerInvoice(
            invoiceResult.data as InvoiceRow,
            { order_number: order.order_number, service_id: order.service_id },
            serviceNames,
          ),
      photos: photoRows
        .map((row, index) => ({ row, photo: toPhoto(index) }))
        .filter(({ row }) => row.photo_type !== "result")
        .map(({ photo }) => photo),
      resultPhotos: photoRows
        .map((row, index) => ({ row, photo: toPhoto(index) }))
        .filter(({ row }) => row.photo_type === "result")
        .map(({ photo }) => photo),
    },
  };
}

/**
 * Daftar tagihan milik customer. Query dibatasi lewat `order_id` milik
 * customer sendiri, jadi kebocoran data tidak mungkin terjadi walau RLS
 * longgar atau policy belum deployed.
 */
export async function getCustomerInvoices(
  userId: string,
): Promise<Result<CustomerInvoice[]>> {
  if (isDemoMode()) {
    return { ok: true, data: demoCustomerInvoices(userId) };
  }

  if (!hasSupabaseEnv) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const serviceNames = await getServiceNameMap();

  const { data: orders, error: ordersError } = await supabase
    .from("service_orders")
    .select("id, order_number, service_id")
    .eq("customer_id", userId);

  if (ordersError) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const orderMap = new Map((orders ?? []).map((row) => [row.id, row]));

  if (orderMap.size === 0) {
    return { ok: true, data: [] };
  }

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(INVOICE_COLUMNS)
    .in("order_id", [...orderMap.keys()])
    .order("issued_at", { ascending: false });

  if (error) {
    return { ok: false, error: GENERIC_ERROR };
  }

  return {
    ok: true,
    data: (invoices ?? []).map((invoice) => {
      const row = invoice as InvoiceRow;
      const order = orderMap.get(row.order_id);
      return toCustomerInvoice(
        row,
        {
          order_number: order?.order_number ?? "—",
          service_id: order?.service_id ?? null,
        },
        serviceNames,
      );
    }),
  };
}

/**
 * Detail satu tagihan. Kepemilikan diverifikasi lewat order: kalau order
 * invoice itu bukan milik customer yang sedang login, hasilnya null (404)
 * supaya ID tagihan orang lain tidak bisa ditebak.
 */
export async function getCustomerInvoice(
  userId: string,
  invoiceId: string,
): Promise<Result<CustomerInvoice | null>> {
  if (isDemoMode()) {
    return { ok: true, data: demoCustomerInvoice(userId, invoiceId) };
  }

  if (!hasSupabaseEnv) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(INVOICE_COLUMNS)
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: GENERIC_ERROR };
  }

  if (!invoice) {
    return { ok: true, data: null };
  }

  const { data: order } = await supabase
    .from("service_orders")
    .select("id, order_number, service_id, customer_id")
    .eq("id", invoice.order_id)
    .eq("customer_id", userId)
    .maybeSingle();

  if (!order) {
    return { ok: true, data: null };
  }

  const serviceNames = await getServiceNameMap();

  return {
    ok: true,
    data: toCustomerInvoice(
      invoice as InvoiceRow,
      { order_number: order.order_number, service_id: order.service_id },
      serviceNames,
    ),
  };
}

/**
 * Jumlah notifikasi yang belum dibaca. Dipakai untuk badge lonceng, jadi
 * cukup angka dan tidak memuat isi notifikasi ke payload halaman.
 */
export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  if (isDemoMode()) {
    return demoUnreadCount(userId);
  }

  if (!hasSupabaseEnv) {
    return 0;
  }

  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function getCustomerNotifications(
  userId: string,
  limit?: number,
): Promise<Result<CustomerNotification[]>> {
  if (isDemoMode()) {
    return { ok: true, data: demoCustomerNotifications(userId, limit) };
  }

  if (!hasSupabaseEnv) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("id, title, message, type, is_read, created_at")
    .eq("user_id", userId)
    .order("is_read", { ascending: true })
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    return { ok: false, error: GENERIC_ERROR };
  }

  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      type: row.type,
      is_read: row.is_read,
      created_at: row.created_at,
    })),
  };
}

/**
 * Jumlah tagihan milik customer yang belum lunas.
 *
 * Dihitung lewat daftar order miliknya sendiri, bukan hanya mengandalkan RLS.
 * Query tetap benar walau policy berubah dan tidak pernah menghitung tagihan
 * orang lain.
 */
async function countUnpaidInvoices(
  supabase: PhotoStore,
  orderIds: string[],
): Promise<number> {
  if (orderIds.length === 0) {
    return 0;
  }

  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .in("order_id", orderIds)
    .in("payment_status", UNPAID_STATUSES);

  return count ?? 0;
}

export async function getCustomerDashboard(
  userId: string,
): Promise<Result<DashboardData>> {
  if (isDemoMode()) {
    return { ok: true, data: demoCustomerDashboard(userId) };
  }

  const ordersResult = await getCustomerOrders(userId);
  const notificationsResult = await getCustomerNotifications(userId, 5);

  if (!ordersResult.ok || !notificationsResult.ok) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const orders = ordersResult.data;
  let unpaidInvoices = 0;

  if (hasSupabaseEnv && orders.length > 0) {
    const supabase = await createClient();
    unpaidInvoices = await countUnpaidInvoices(
      supabase,
      orders.map((order) => order.id),
    );
  }

  return {
    ok: true,
    data: {
      orders,
      recentOrders: orders.slice(0, 5),
      notifications: notificationsResult.data,
      totals: {
        total: orders.length,
        active: orders.filter((order) =>
          ACTIVE_STATUSES.includes(order.status),
        ).length,
        completed: orders.filter((order) =>
          COMPLETED_STATUSES.includes(order.status),
        ).length,
        unpaidInvoices,
      },
    },
  };
}