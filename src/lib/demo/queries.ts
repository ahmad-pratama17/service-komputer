import "server-only";

import type {
  CustomerInvoice,
  CustomerNotification,
  CustomerOrder,
  CustomerOrderDetail,
  DashboardData,
} from "@/lib/orders";
import type {
  AdminCustomerListItem,
  AdminInvoiceItem,
  AdminNotificationItem,
  AdminOrderAnalysisContext,
  AdminOrderDetail,
  AdminOrderListItem,
  AdminServiceItem,
  AdminStats,
  OrderFilters,
} from "@/lib/admin";
import type { PublicService } from "@/lib/services";
import type { TeknisiStats } from "@/lib/teknisi";
import type { AiMessage } from "@/lib/ai/conversations";
import type { OrderStatus } from "@/types";
import { AI_HISTORY_LIMIT } from "@/lib/validations/ai";
import { loadDb, type DemoOrder } from "@/lib/demo/store";

/**
 * Versi demo dari semua fungsi baca. Bentuk kembalian disamakan persis
 * dengan fungsi aslinya supaya pemanggil tidak perlu tahu sedang mode demo.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serviceNameMap(db: ReturnType<typeof loadDb>): Map<string, string> {
  return new Map(db.services.map((service) => [service.id, service.name]));
}

function customerName(db: ReturnType<typeof loadDb>, id: string): string {
  return db.users.find((user) => user.id === id)?.name ?? "Pelanggan dihapus";
}

function customerEmail(db: ReturnType<typeof loadDb>, id: string): string {
  return db.users.find((user) => user.id === id)?.email ?? "—";
}

function deviceLabel(order: DemoOrder): string {
  return [order.device_type, order.device_brand, order.device_model]
    .filter(Boolean)
    .join(" ");
}

function toCustomerOrder(
  db: ReturnType<typeof loadDb>,
  order: DemoOrder,
): CustomerOrder {
  return {
    id: order.id,
    order_number: order.order_number,
    service_id: order.service_id,
    service_name: order.service_id
      ? (serviceNameMap(db).get(order.service_id) ?? null)
      : null,
    device_type: order.device_type,
    device_brand: order.device_brand,
    device_model: order.device_model,
    problem_description: order.problem_description,
    address: order.address,
    preferred_schedule: order.preferred_schedule,
    additional_notes: order.additional_notes,
    status: order.status,
    diagnosis: order.diagnosis,
    estimated_cost: order.estimated_cost,
    final_cost: order.final_cost,
    // Selalu null di jalur customer, sama seperti perilaku produksi
    // setelah keputusan menyembunyikan catatan internal.
    admin_notes: null,
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
}

function toListItem(
  db: ReturnType<typeof loadDb>,
  order: DemoOrder,
): AdminOrderListItem {
  return {
    id: order.id,
    order_number: order.order_number,
    customer_id: order.customer_id,
    customer_name: customerName(db, order.customer_id),
    customer_email: customerEmail(db, order.customer_id),
    service_name: order.service_id
      ? (serviceNameMap(db).get(order.service_id) ?? null)
      : null,
    device: deviceLabel(order),
    status: order.status,
    estimated_cost: order.estimated_cost,
    final_cost: order.final_cost,
    created_at: order.created_at,
  };
}

function toCustomerInvoice(
  db: ReturnType<typeof loadDb>,
  orderNumber: string,
  serviceId: string | null,
  invoice: {
    id: string;
    order_id: string;
    invoice_number: string;
    description: string;
    subtotal: number;
    total: number;
    payment_status: CustomerInvoice["payment_status"];
    payment_method: CustomerInvoice["payment_method"];
    issued_at: string;
    due_at: string | null;
    paid_at: string | null;
  },
): CustomerInvoice {
  return {
    id: invoice.id,
    order_id: invoice.order_id,
    order_number: orderNumber,
    service_name: serviceId
      ? (serviceNameMap(db).get(serviceId) ?? null)
      : null,
    invoice_number: invoice.invoice_number,
    description: invoice.description,
    subtotal: invoice.subtotal,
    total: invoice.total,
    payment_status: invoice.payment_status,
    payment_method: invoice.payment_method,
    issued_at: invoice.issued_at,
    due_at: invoice.due_at,
    paid_at: invoice.paid_at,
  };
}

const byCreatedDesc = (a: { created_at: string }, b: { created_at: string }) =>
  b.created_at.localeCompare(a.created_at);

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

export function demoCustomerOrders(userId: string): CustomerOrder[] {
  const db = loadDb();
  return db.orders
    .filter((order) => order.customer_id === userId)
    .sort(byCreatedDesc)
    .map((order) => toCustomerOrder(db, order));
}

export function demoCustomerOrderDetail(
  userId: string,
  orderId: string,
): CustomerOrderDetail | null {
  const db = loadDb();
  const order = db.orders.find(
    (row) => row.id === orderId && row.customer_id === userId,
  );
  if (!order) {
    return null;
  }

  const history = db.history
    .filter((row) => row.order_id === orderId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((row) => ({
      id: row.id,
      order_id: row.order_id,
      old_status: row.old_status,
      new_status: row.new_status,
      note: row.note,
      changed_by: row.changed_by,
      created_at: row.created_at,
    }));

  const invoiceRow = db.invoices.find((row) => row.order_id === orderId) ?? null;

  const photos = db.photos
    .filter((row) => row.order_id === orderId && row.photo_type !== "result")
    .map((row) => ({ id: row.id, fileName: row.file_name, url: null }));
  const resultPhotos = db.photos
    .filter((row) => row.order_id === orderId && row.photo_type === "result")
    .map((row) => ({ id: row.id, fileName: row.file_name, url: null }));

  return {
    order: toCustomerOrder(db, order),
    history,
    invoice: invoiceRow
      ? toCustomerInvoice(db, order.order_number, order.service_id, invoiceRow)
      : null,
    photos,
    resultPhotos,
  };
}

export function demoCustomerInvoices(userId: string): CustomerInvoice[] {
  const db = loadDb();
  const orderMap = new Map(
    db.orders
      .filter((order) => order.customer_id === userId)
      .map((order) => [order.id, order]),
  );
  if (orderMap.size === 0) {
    return [];
  }
  return db.invoices
    .filter((invoice) => orderMap.has(invoice.order_id))
    .sort((a, b) => b.issued_at.localeCompare(a.issued_at))
    .map((invoice) => {
      const order = orderMap.get(invoice.order_id)!;
      return toCustomerInvoice(
        db,
        order.order_number,
        order.service_id,
        invoice,
      );
    });
}

export function demoCustomerInvoice(
  userId: string,
  invoiceId: string,
): CustomerInvoice | null {
  const db = loadDb();
  const invoice = db.invoices.find((row) => row.id === invoiceId);
  if (!invoice) {
    return null;
  }
  const order = db.orders.find(
    (row) => row.id === invoice.order_id && row.customer_id === userId,
  );
  if (!order) {
    return null;
  }
  return toCustomerInvoice(db, order.order_number, order.service_id, invoice);
}

export function demoUnreadCount(userId: string): number {
  const db = loadDb();
  return db.notifications.filter(
    (row) => row.user_id === userId && !row.is_read,
  ).length;
}

export function demoCustomerNotifications(
  userId: string,
  limit?: number,
): CustomerNotification[] {
  const db = loadDb();
  const rows = db.notifications
    .filter((row) => row.user_id === userId)
    .sort((a, b) => {
      if (a.is_read !== b.is_read) {
        return a.is_read ? 1 : -1;
      }
      return b.created_at.localeCompare(a.created_at);
    })
    .map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      type: row.type,
      is_read: row.is_read,
      created_at: row.created_at,
    }));
  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

export function demoUnpaidInvoiceCount(userId: string): number {
  const db = loadDb();
  const orderIds = new Set(
    db.orders
      .filter((order) => order.customer_id === userId)
      .map((order) => order.id),
  );
  return db.invoices.filter(
    (invoice) =>
      orderIds.has(invoice.order_id) &&
      (invoice.payment_status === "unpaid" ||
        invoice.payment_status === "pending" ||
        invoice.payment_status === "partially_paid"),
  ).length;
}

const ACTIVE_STATUSES: OrderStatus[] = [
  "pending",
  "accepted",
  "diagnosis",
  "waiting_approval",
  "in_progress",
];
const COMPLETED_STATUSES: OrderStatus[] = ["completed", "paid", "closed"];

export function demoCustomerDashboard(userId: string): DashboardData {
  const orders = demoCustomerOrders(userId);
  return {
    orders,
    recentOrders: orders.slice(0, 5),
    notifications: demoCustomerNotifications(userId, 5),
    totals: {
      total: orders.length,
      active: orders.filter((order) => ACTIVE_STATUSES.includes(order.status))
        .length,
      completed: orders.filter((order) =>
        COMPLETED_STATUSES.includes(order.status),
      ).length,
      unpaidInvoices: demoUnpaidInvoiceCount(userId),
    },
  };
}

export function demoActiveServices(): PublicService[] {
  const db = loadDb();
  return db.services
    .filter((service) => service.is_active)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      category: service.category,
      starting_price: service.starting_price,
      estimated_duration: service.estimated_duration,
    }));
}

export function demoAssistantServices(): {
  name: string;
  description: string | null;
  category: string;
  startingPrice: number;
  estimatedDuration: number;
}[] {
  const db = loadDb();
  return db.services
    .filter((service) => service.is_active)
    .sort((a, b) => a.starting_price - b.starting_price)
    .slice(0, 30)
    .map((service) => ({
      name: service.name,
      description: service.description,
      category: service.category,
      startingPrice: service.starting_price,
      estimatedDuration: service.estimated_duration,
    }));
}

export function demoAiHistory(
  userId: string,
  limit = AI_HISTORY_LIMIT,
): AiMessage[] {
  const db = loadDb();
  return (db.conversations[userId] ?? [])
    .slice(-limit)
    .map((row) => ({
      id: row.id,
      role: row.role,
      message: row.message,
      created_at: row.created_at,
    }));
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

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
const COMPLETED_ORDER_STATUSES: OrderStatus[] = [
  "completed",
  "paid",
  "closed",
];

export function demoAdminStats(): AdminStats {
  const db = loadDb();
  const statusCounts = Object.fromEntries(
    ALL_ORDER_STATUSES.map((status) => [status, 0]),
  ) as Record<OrderStatus, number>;
  for (const order of db.orders) {
    statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;
  }
  return {
    statusCounts,
    totalOrders: db.orders.length,
    pendingOrders: db.orders.filter((order) => order.status === "pending")
      .length,
    activeServices: db.services.filter((service) => service.is_active).length,
    completedServices: db.orders.filter((order) =>
      COMPLETED_ORDER_STATUSES.includes(order.status),
    ).length,
    unpaidInvoices: db.invoices.filter(
      (invoice) => invoice.payment_status !== "paid",
    ).length,
    revenue: db.invoices
      .filter((invoice) => invoice.payment_status === "paid")
      .reduce((total, invoice) => total + invoice.total, 0),
  };
}

export function demoTeknisiStats(): TeknisiStats {
  const full = demoAdminStats();
  return {
    statusCounts: full.statusCounts,
    totalOrders: full.totalOrders,
    pendingOrders: full.pendingOrders,
    activeServices: full.activeServices,
    completedServices: full.completedServices,
  };
}

export function demoAdminOrders(filters: OrderFilters = {}): {
  orders: AdminOrderListItem[];
  total: number;
} {
  const db = loadDb();
  let rows = [...db.orders].sort(byCreatedDesc);
  if (filters.status) {
    rows = rows.filter((row) => row.status === filters.status);
  }
  const total = rows.length;
  if (filters.limit) {
    rows = rows.slice(0, filters.limit);
  }
  const search = filters.search?.trim().toLowerCase();
  if (search) {
    rows = rows.filter((row) => {
      const customer = db.users.find((user) => user.id === row.customer_id);
      return (
        row.order_number.toLowerCase().includes(search) ||
        (customer?.name ?? "").toLowerCase().includes(search) ||
        (customer?.email ?? "").toLowerCase().includes(search)
      );
    });
  }
  return { orders: rows.map((row) => toListItem(db, row)), total };
}

export function demoAdminOrderDetail(orderId: string): {
  found: false;
} | {
  found: true;
  detail: AdminOrderDetail;
} {
  const db = loadDb();
  const order = db.orders.find((row) => row.id === orderId);
  if (!order) {
    return { found: false };
  }

  const historyRows = db.history
    .filter((row) => row.order_id === orderId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const photoRows = db.photos.filter((row) => row.order_id === orderId);
  const invoiceRows = db.invoices.filter((row) => row.order_id === orderId);
  const previousOrderCount = db.orders.filter(
    (row) => row.customer_id === order.customer_id && row.id !== orderId,
  ).length;

  return {
    found: true,
    detail: {
      order: {
        ...toListItem(db, order),
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
      previousOrderCount,
      history: historyRows.map((row) => ({
        id: row.id,
        old_status: row.old_status,
        new_status: row.new_status,
        note: row.note,
        changed_by: row.changed_by,
        changed_by_name: row.changed_by
          ? (db.users.find((user) => user.id === row.changed_by)?.name ?? null)
          : null,
        created_at: row.created_at,
      })),
      photos: photoRows
        .filter((row) => row.photo_type !== "result")
        .map((row) => ({
          id: row.id,
          fileName: row.file_name,
          url: null,
          createdAt: row.created_at,
        })),
      resultPhotos: photoRows
        .filter((row) => row.photo_type === "result")
        .map((row) => ({
          id: row.id,
          fileName: row.file_name,
          url: null,
          createdAt: row.created_at,
        })),
      invoices: invoiceRows.map((invoice) => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        order_id: invoice.order_id,
        order_number: order.order_number,
        customer_name: customerName(db, order.customer_id),
        service_name: order.service_id
          ? (serviceNameMap(db).get(order.service_id) ?? null)
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

export function demoAdminOrderAnalysisContext(
  orderId: string,
): AdminOrderAnalysisContext | null {
  const db = loadDb();
  const order = db.orders.find((row) => row.id === orderId);
  if (!order) {
    return null;
  }
  const services = db.services
    .filter((service) => service.is_active)
    .sort((a, b) => a.starting_price - b.starting_price)
    .slice(0, 30);
  const currentService = services.find(
    (service) => service.id === order.service_id,
  );
  return {
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
    services: services.map((service) => ({
      name: service.name,
      category: service.category,
      startingPrice: service.starting_price,
      estimatedDuration: service.estimated_duration,
    })),
    history: db.orders
      .filter(
        (row) => row.customer_id === order.customer_id && row.id !== orderId,
      )
      .sort(byCreatedDesc)
      .slice(0, 6)
      .map((row) => ({
        orderNumber: row.order_number,
        createdAt: row.created_at,
        status: row.status,
        problemDescription: row.problem_description,
        diagnosis: row.diagnosis,
        finalCost: row.final_cost,
      })),
  };
}

export function demoAdminCustomers(): AdminCustomerListItem[] {
  const db = loadDb();
  return db.users
    .filter((user) => user.role === "customer")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((user) => {
      const userOrders = db.orders
        .filter((order) => order.customer_id === user.id)
        .sort(byCreatedDesc);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        order_count: userOrders.length,
        last_order_at: userOrders[0]?.created_at ?? null,
        created_at: user.created_at,
      };
    });
}

export function demoAdminCustomerDetail(customerId: string): {
  customer: AdminCustomerListItem;
  orders: AdminOrderListItem[];
} | null {
  const db = loadDb();
  const profile = db.users.find((user) => user.id === customerId);
  if (!profile) {
    return null;
  }
  const userOrders = db.orders
    .filter((order) => order.customer_id === customerId)
    .sort(byCreatedDesc);
  return {
    customer: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      created_at: profile.created_at,
      order_count: userOrders.length,
      last_order_at: userOrders[0]?.created_at ?? null,
    },
    orders: userOrders.map((row) => toListItem(db, row)),
  };
}

export function demoAdminServices(): AdminServiceItem[] {
  const db = loadDb();
  const orderCounts = new Map<string, number>();
  for (const order of db.orders) {
    if (!order.service_id) {
      continue;
    }
    orderCounts.set(order.service_id, (orderCounts.get(order.service_id) ?? 0) + 1);
  }
  return [...db.services]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      category: service.category,
      starting_price: service.starting_price,
      estimated_duration: service.estimated_duration,
      is_active: service.is_active,
      order_count: orderCounts.get(service.id) ?? 0,
      created_at: service.created_at,
    }));
}

export function demoAdminInvoices(): AdminInvoiceItem[] {
  const db = loadDb();
  const orderMap = new Map(db.orders.map((order) => [order.id, order]));
  return [...db.invoices]
    .sort((a, b) => b.issued_at.localeCompare(a.issued_at))
    .map((invoice) => {
      const order = orderMap.get(invoice.order_id);
      return {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        order_id: invoice.order_id,
        order_number: order?.order_number ?? "—",
        customer_name: order ? customerName(db, order.customer_id) : "—",
        service_name:
          order?.service_id != null
            ? (serviceNameMap(db).get(order.service_id) ?? null)
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
    });
}

export function demoAdminNotifications(
  userId: string,
  limit = 100,
): AdminNotificationItem[] {
  const db = loadDb();
  return db.notifications
    .filter((row) => row.user_id === userId)
    .sort((a, b) => {
      if (a.is_read !== b.is_read) {
        return a.is_read ? 1 : -1;
      }
      return b.created_at.localeCompare(a.created_at);
    })
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      message: row.message,
      type: row.type,
      is_read: row.is_read,
      created_at: row.created_at,
    }));
}
