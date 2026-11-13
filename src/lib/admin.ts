import "server-only";

import { createClient } from "@/lib/supabase/server";
import { ORDER_PHOTO_BUCKET } from "@/lib/constants";
import { isDemoMode } from "@/lib/demo/mode";
import {
  demoAdminCustomerDetail,
  demoAdminCustomers,
  demoAdminInvoices,
  demoAdminNotifications,
  demoAdminOrderAnalysisContext,
  demoAdminOrderDetail,
  demoAdminOrders,
  demoAdminServices,
  demoAdminStats,
  demoUnreadCount,
} from "@/lib/demo/queries";
import type {
  InvoicePaymentMethod,
  InvoicePaymentStatus,
  NotificationType,
  OrderStatus,
  ServiceCategory,
} from "@/types";

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const GENERIC_ERROR = "Gagal memuat data. Silakan coba lagi.";

const PHOTO_URL_TTL_SECONDS = 60 * 60;

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "accepted",
  "diagnosis",
  "waiting_approval",
  "in_progress",
];

const COMPLETED_ORDER_STATUSES: OrderStatus[] = [
  "completed",
  "paid",
  "closed",
];

const UNPAID_STATUSES: InvoicePaymentStatus[] = [
  "unpaid",
  "pending",
  "partially_paid",
];

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type AdminStats = {
  totalOrders: number;
  pendingOrders: number;
  activeServices: number;
  completedServices: number;
  unpaidInvoices: number;
  revenue: number;
  statusCounts: Record<OrderStatus, number>;
};

export type AdminCustomerRef = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

export type AdminOrderPhoto = {
  id: string;
  fileName: string;
  url: string | null;
  createdAt: string;
};

export type AdminOrderListItem = {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  service_name: string | null;
  device: string;
  status: OrderStatus;
  estimated_cost: number | null;
  final_cost: number | null;
  created_at: string;
};

export type AdminOrderDetail = {
  order: AdminOrderListItem & {
    service_id: string | null;
    device_type: string;
    device_brand: string | null;
    device_model: string | null;
    problem_description: string;
    address: string | null;
    preferred_schedule: string | null;
    additional_notes: string | null;
    diagnosis: string | null;
    admin_notes: string | null;
    updated_at: string;
  };
  previousOrderCount: number;
  history: {
    id: string;
    old_status: OrderStatus | null;
    new_status: OrderStatus;
    note: string | null;
    changed_by: string | null;
    changed_by_name: string | null;
    created_at: string;
  }[];
  photos: AdminOrderPhoto[];
  resultPhotos: AdminOrderPhoto[];
  invoices: AdminInvoiceItem[];
};

export type AdminCustomerListItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  order_count: number;
  last_order_at: string | null;
  created_at: string;
};

export type AdminCustomerDetail = {
  customer: AdminCustomerListItem;
  orders: AdminOrderListItem[];
};

export type AdminServiceItem = {
  id: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  starting_price: number;
  estimated_duration: number;
  is_active: boolean;
  order_count: number;
  created_at: string;
};

export type AdminInvoiceItem = {
  id: string;
  invoice_number: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  service_name: string | null;
  description: string;
  subtotal: number;
  total: number;
  payment_status: InvoicePaymentStatus;
  payment_method: InvoicePaymentMethod;
  due_at: string | null;
  issued_at: string;
  paid_at: string | null;
};

export type AdminNotificationItem = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
};

export type OrderFilters = {
  status?: OrderStatus;
  search?: string;
  limit?: number;
};

export type AdminOrderAnalysisContext = {
  order: {
    orderNumber: string;
    serviceName: string | null;
    deviceType: string;
    deviceBrand: string | null;
    deviceModel: string | null;
    problemDescription: string;
    additionalNotes: string | null;
    adminNotes: string | null;
    status: OrderStatus;
    createdAt: string;
  };
  services: {
    name: string;
    category: string;
    startingPrice: number;
    estimatedDuration: number;
  }[];
  history: {
    orderNumber: string;
    createdAt: string;
    status: OrderStatus;
    problemDescription: string;
    diagnosis: string | null;
    finalCost: number | null;
  }[];
};

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string;
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
};

const ALL_ORDER_STATUSES: OrderStatus[] = [
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

export function isOrderStatus(value: string | undefined): value is OrderStatus {
  return Boolean(value) && ALL_ORDER_STATUSES.includes(value as OrderStatus);
}

async function fetchCustomerMap(): Promise<Map<string, CustomerRow>> {
  if (!hasSupabaseEnv) {
    return new Map();
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, name, email, phone");
  return new Map((data ?? []).map((row) => [row.id, row]));
}

async function fetchServiceNameMap(): Promise<Map<string, string>> {
  if (!hasSupabaseEnv) {
    return new Map();
  }
  const supabase = await createClient();
  const { data } = await supabase.from("services").select("id, name");
  return new Map((data ?? []).map((row) => [row.id, row.name]));
}

/** Nama pelaku perubahan status (admin atau customer), untuk timeline audit. */
async function fetchProfileNameMap(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0 || !hasSupabaseEnv) {
    return new Map();
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", ids);
  return new Map((data ?? []).map((row) => [row.id, row.name]));
}

function deviceLabel(row: OrderRow): string {
  return [row.device_type, row.device_brand, row.device_model]
    .filter(Boolean)
    .join(" ");
}

function toListItem(
  row: OrderRow,
  customers: Map<string, CustomerRow>,
  serviceNames: Map<string, string>,
): AdminOrderListItem {
  const customer = customers.get(row.customer_id);
  return {
    id: row.id,
    order_number: row.order_number,
    customer_id: row.customer_id,
    customer_name: customer?.name ?? "Pelanggan dihapus",
    customer_email: customer?.email ?? "—",
    service_name: row.service_id
      ? (serviceNames.get(row.service_id) ?? null)
      : null,
    device: deviceLabel(row),
    status: row.status,
    estimated_cost: row.estimated_cost,
    final_cost: row.final_cost,
    created_at: row.created_at,
  };
}

export async function getAdminStats(): Promise<Result<AdminStats>> {
  if (isDemoMode()) {
    return { ok: true, data: demoAdminStats() };
  }

  if (!hasSupabaseEnv) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();

  const [ordersResult, servicesResult, invoicesResult, paidResult] =
    await Promise.all([
      supabase
        .from("service_orders")
        .select("id, status, final_cost", { count: "exact" }),
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .in("payment_status", UNPAID_STATUSES),
      supabase
        .from("invoices")
        .select("total")
        .eq("payment_status", "paid"),
    ]);

  const orders = ordersResult.data ?? [];

  const statusCounts = Object.fromEntries(
    ALL_ORDER_STATUSES.map((status) => [status, 0]),
  ) as Record<OrderStatus, number>;

  for (const row of orders) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
  }

  return {
    ok: true,
    data: {
      statusCounts,
      totalOrders: ordersResult.count ?? orders.length,
      pendingOrders: orders.filter((row) => row.status === "pending").length,
      activeServices: servicesResult.count ?? 0,
      completedServices: orders.filter((row) =>
        COMPLETED_ORDER_STATUSES.includes(row.status),
      ).length,
      unpaidInvoices: invoicesResult.count ?? 0,
      revenue: (paidResult.data ?? []).reduce(
        (total, invoice) => total + invoice.total,
        0,
      ),
    },
  };
}

export type AdminOrderQueryResult = {
  orders: AdminOrderListItem[];
  total: number;
};

export async function getAdminOrders(
  filters: OrderFilters = {},
): Promise<Result<AdminOrderQueryResult>> {
  if (isDemoMode()) {
    return { ok: true, data: demoAdminOrders(filters) };
  }

  if (!hasSupabaseEnv) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const [customers, serviceNames] = await Promise.all([
    fetchCustomerMap(),
    fetchServiceNameMap(),
  ]);

  let query = supabase
    .from("service_orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const search = filters.search?.trim().toLowerCase();

  const rows = (data ?? []).filter((row) => {
    if (!search) {
      return true;
    }
    const customer = customers.get(row.customer_id);
    return (
      row.order_number.toLowerCase().includes(search) ||
      (customer?.name ?? "").toLowerCase().includes(search) ||
      (customer?.email ?? "").toLowerCase().includes(search)
    );
  });

  return {
    ok: true,
    data: {
      orders: rows.map((row) => toListItem(row, customers, serviceNames)),
      total: data?.length ?? 0,
    },
  };
}

/**
 * Konteks read-only untuk AI Copilot: detail pesanan, katalog layanan, dan
 * riwayat service customer yang sama. Tidak ada penulisan ke database di sini.
 */
export async function getAdminOrderAnalysisContext(
  orderId: string,
): Promise<Result<AdminOrderAnalysisContext | null>> {
  if (isDemoMode()) {
    return { ok: true, data: demoAdminOrderAnalysisContext(orderId) };
  }

  if (!hasSupabaseEnv) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();

  const { data: order, error: orderError } = await supabase
    .from("service_orders")
    .select(
      "id, order_number, customer_id, service_id, device_type, device_brand, device_model, problem_description, additional_notes, admin_notes, status, created_at",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    return { ok: false, error: GENERIC_ERROR };
  }

  if (!order) {
    return { ok: true, data: null };
  }

  const [servicesResult, historyResult] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, category, starting_price, estimated_duration")
      .eq("is_active", true)
      .order("starting_price", { ascending: true })
      .limit(30),
    supabase
      .from("service_orders")
      .select("order_number, status, problem_description, diagnosis, final_cost, created_at")
      .eq("customer_id", order.customer_id)
      .neq("id", orderId)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const services = servicesResult.data ?? [];
  const currentService = services.find((row) => row.id === order.service_id);

  return {
    ok: true,
    data: {
      order: {
        orderNumber: order.order_number,
        serviceName: currentService?.name ?? null,
        deviceType: order.device_type,
        deviceBrand: order.device_brand,
        deviceModel: order.device_model,
        problemDescription: order.problem_description,
        additionalNotes: order.additional_notes,
        adminNotes: order.admin_notes,
        status: order.status,
        createdAt: order.created_at,
      },
      services: services.map((row) => ({
        name: row.name,
        category: row.category,
        startingPrice: row.starting_price,
        estimatedDuration: row.estimated_duration,
      })),
      history: (historyResult.data ?? []).map((row) => ({
        orderNumber: row.order_number,
        createdAt: row.created_at,
        status: row.status,
        problemDescription: row.problem_description,
        diagnosis: row.diagnosis,
        finalCost: row.final_cost,
      })),
    },
  };
}

export async function getAdminOrderDetail(
  orderId: string,
): Promise<Result<AdminOrderDetail | null>> {
  if (isDemoMode()) {
    const result = demoAdminOrderDetail(orderId);
    return result.found
      ? { ok: true, data: result.detail }
      : { ok: true, data: null };
  }

  if (!hasSupabaseEnv) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const [customers, serviceNames] = await Promise.all([
    fetchCustomerMap(),
    fetchServiceNameMap(),
  ]);

  const { data: order, error: orderError } = await supabase
    .from("service_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    return { ok: false, error: GENERIC_ERROR };
  }

  if (!order) {
    return { ok: true, data: null };
  }

  const [historyResult, photosResult, invoicesResult, previousCountResult] =
    await Promise.all([
      supabase
        .from("order_status_history")
        .select("id, old_status, new_status, note, changed_by, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false }),
      supabase
        .from("service_order_photos")
        .select("id, storage_path, file_name, photo_type, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true }),
      supabase
        .from("invoices")
        .select(
          "id, invoice_number, order_id, description, subtotal, total, payment_status, payment_method, due_at, issued_at, paid_at",
        )
        .eq("order_id", orderId)
        .order("issued_at", { ascending: false }),
      supabase
        .from("service_orders")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", order.customer_id)
        .neq("id", orderId),
    ]);

  if (historyResult.error || invoicesResult.error) {
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

  const withUrl = (index: number) => ({
    id: photoRows[index].id,
    fileName: photoRows[index].file_name,
    url: signedUrls[index]?.data?.signedUrl ?? null,
    createdAt: photoRows[index].created_at,
  });

  const historyRows = historyResult.data ?? [];
  const actorIds = [
    ...new Set(
      historyRows
        .map((row) => row.changed_by)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const actorNames = await fetchProfileNameMap(actorIds);

  return {
    ok: true,
    data: {
      order: {
        ...toListItem(order, customers, serviceNames),
        service_id: order.service_id,
        device_type: order.device_type,
        device_brand: order.device_brand,
        device_model: order.device_model,
        problem_description: order.problem_description,
        address: order.address,
        preferred_schedule: order.preferred_schedule,
        additional_notes: order.additional_notes,
        diagnosis: order.diagnosis,
        admin_notes: order.admin_notes,
        updated_at: order.updated_at,
      },
      previousOrderCount: previousCountResult.count ?? 0,
      history: historyRows.map((row) => ({
        id: row.id,
        old_status: row.old_status,
        new_status: row.new_status,
        note: row.note,
        changed_by: row.changed_by,
        changed_by_name: row.changed_by
          ? (actorNames.get(row.changed_by) ?? null)
          : null,
        created_at: row.created_at,
      })),
      photos: photoRows
        .map((row, index) => ({ row, item: withUrl(index) }))
        .filter(({ row }) => row.photo_type !== "result")
        .map(({ item }) => item),
      resultPhotos: photoRows
        .map((row, index) => ({ row, item: withUrl(index) }))
        .filter(({ row }) => row.photo_type === "result")
        .map(({ item }) => item),
      invoices: (invoicesResult.data ?? []).map((invoice) => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        order_id: invoice.order_id,
        order_number: order.order_number,
        customer_name: customers.get(order.customer_id)?.name ?? "-",
        service_name: order.service_id
          ? (serviceNames.get(order.service_id) ?? null)
          : null,
        description: invoice.description,
        subtotal: invoice.subtotal,
        total: invoice.total,
        payment_status: invoice.payment_status,
        payment_method: invoice.payment_method,
        due_at: invoice.due_at,
        issued_at: invoice.issued_at,
        paid_at: invoice.paid_at,
      })),
    },
  };
}

export async function getAdminCustomers(): Promise<
  Result<AdminCustomerListItem[]>
> {
  if (isDemoMode()) {
    return { ok: true, data: demoAdminCustomers() };
  }

  if (!hasSupabaseEnv) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();

  const [profilesResult, ordersResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email, phone, created_at")
      .eq("role", "customer")
      .order("created_at", { ascending: false }),
    supabase
      .from("service_orders")
      .select("customer_id, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (profilesResult.error) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const ordersByCustomer = new Map<string, { count: number; last: string }>();
  for (const row of ordersResult.data ?? []) {
    const existing = ordersByCustomer.get(row.customer_id);
    if (existing) {
      existing.count += 1;
      continue;
    }
    ordersByCustomer.set(row.customer_id, {
      count: 1,
      last: row.created_at,
    });
  }

  return {
    ok: true,
    data: (profilesResult.data ?? []).map((row) => {
      const summary = ordersByCustomer.get(row.id);
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        order_count: summary?.count ?? 0,
        last_order_at: summary?.last ?? null,
        created_at: row.created_at,
      };
    }),
  };
}

export async function getAdminCustomerDetail(
  customerId: string,
): Promise<Result<AdminCustomerDetail | null>> {
  if (isDemoMode()) {
    return { ok: true, data: demoAdminCustomerDetail(customerId) };
  }

  if (!hasSupabaseEnv) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const [customers, serviceNames] = await Promise.all([
    fetchCustomerMap(),
    fetchServiceNameMap(),
  ]);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, email, phone, created_at")
    .eq("id", customerId)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: GENERIC_ERROR };
  }

  if (!profile) {
    return { ok: true, data: null };
  }

  const { data: orders, error: ordersError } = await supabase
    .from("service_orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (ordersError) {
    return { ok: false, error: GENERIC_ERROR };
  }

  return {
    ok: true,
    data: {
      customer: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        created_at: profile.created_at,
        order_count: orders?.length ?? 0,
        last_order_at: orders?.[0]?.created_at ?? null,
      },
      orders: (orders ?? []).map((row) =>
        toListItem(row, customers, serviceNames),
      ),
    },
  };
}

export async function getAdminServices(): Promise<Result<AdminServiceItem[]>> {
  if (isDemoMode()) {
    return { ok: true, data: demoAdminServices() };
  }

  if (!hasSupabaseEnv) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();

  const [servicesResult, ordersResult] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .order("name", { ascending: true }),
    supabase
      .from("service_orders")
      .select("service_id")
      .not("service_id", "is", null),
  ]);

  if (servicesResult.error) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const orderCounts = new Map<string, number>();
  for (const row of ordersResult.data ?? []) {
    if (!row.service_id) {
      continue;
    }
    orderCounts.set(row.service_id, (orderCounts.get(row.service_id) ?? 0) + 1);
  }

  return {
    ok: true,
    data: (servicesResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      starting_price: row.starting_price,
      estimated_duration: row.estimated_duration,
      is_active: row.is_active,
      order_count: orderCounts.get(row.id) ?? 0,
      created_at: row.created_at,
    })),
  };
}

export async function getAdminInvoices(): Promise<Result<AdminInvoiceItem[]>> {
  if (isDemoMode()) {
    return { ok: true, data: demoAdminInvoices() };
  }

  if (!hasSupabaseEnv) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("*")
    .order("issued_at", { ascending: false });

  if (error) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const orderIds = [
    ...new Set((invoices ?? []).map((invoice) => invoice.order_id)),
  ];

  const customers = await fetchCustomerMap();
  const serviceNames = await fetchServiceNameMap();

  let ordersById = new Map<string, OrderRow>();

  if (orderIds.length > 0) {
    const { data: orders } = await supabase
      .from("service_orders")
      .select("*")
      .in("id", orderIds);
    ordersById = new Map((orders ?? []).map((row) => [row.id, row]));
  }

  return {
    ok: true,
    data: (invoices ?? []).map((invoice) => {
      const order = ordersById.get(invoice.order_id);
      const customer = order ? customers.get(order.customer_id) : undefined;
      return {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        order_id: invoice.order_id,
        order_number: order?.order_number ?? "—",
        customer_name: customer?.name ?? "—",
        service_name: order?.service_id
          ? (serviceNames.get(order.service_id) ?? null)
          : null,
        description: invoice.description,
        subtotal: invoice.subtotal,
        total: invoice.total,
        payment_status: invoice.payment_status,
        payment_method: invoice.payment_method,
        due_at: invoice.due_at,
        issued_at: invoice.issued_at,
        paid_at: invoice.paid_at,
      };
    }),
  };
}

/**
 * Notifikasi milik admin. `userId` wajib diisi supaya query tidak pernah
 * jatuh ke policy "admins manage all" dan mengambil notifikasi customer.
 */
export async function getAdminNotifications(
  userId: string,
  limit = 100,
): Promise<Result<AdminNotificationItem[]>> {
  if (isDemoMode()) {
    return { ok: true, data: demoAdminNotifications(userId, limit) };
  }

  if (!hasSupabaseEnv) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, title, message, type, is_read, created_at")
    .eq("user_id", userId)
    .order("is_read", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { ok: false, error: GENERIC_ERROR };
  }

  return { ok: true, data: data ?? [] };
}

/** Jumlah notifikasi admin yang belum dibaca, untuk badge lonceng. */
export async function getAdminUnreadNotificationCount(
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

  return error ? 0 : (count ?? 0);
}

export { ACTIVE_ORDER_STATUSES, ALL_ORDER_STATUSES };
