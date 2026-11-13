import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { DataToolbar } from "@/components/admin/data-toolbar";
import { OrderStatusBadge } from "@/components/customer/order-status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAdminOrders,
  isOrderStatus,
} from "@/lib/admin";
import { ORDER_STATUS_LABEL, ORDER_STATUS_SEQUENCE } from "@/lib/constants";
import { formatDateTime, formatOrderCost } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Pesanan Admin",
};

const statusOptions = ORDER_STATUS_SEQUENCE.map((status) => ({
  value: status,
  label: ORDER_STATUS_LABEL[status],
}));

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = isOrderStatus(params.status) ? params.status : undefined;
  const search = params.q ?? "";

  const result = await getAdminOrders({ status, search });
  const orders = result.ok ? result.data.orders : [];
  const total = result.ok ? result.data.total : 0;

  return (
    <AdminPageShell>
      <PageHeader
        title="Pesanan Service"
        description="Kelola seluruh pesanan yang masuk dari pelanggan."
      />

      <Card className="overflow-hidden">
        <DataToolbar
          filterKey="admin-orders"
          searchValue={search}
          statusValue={status ?? ""}
          statusOptions={statusOptions}
          searchPlaceholder="Cari nomor pesanan, nama, atau email pelanggan"
          statusLabel="Semua status"
          total={total}
          filtered={orders.length}
        />

        {!result.ok ? (
          <EmptyState
            title={result.error}
            description="Pastikan Supabase terhubung lalu muat ulang halaman."
          />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-5 w-5" aria-hidden />}
            title="Tidak ada pesanan"
            description={
              search || status
                ? "Coba ubah kata kunci pencarian atau filter status."
                : "Pesanan pelanggan akan muncul di sini setelah dikirim."
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor Pesanan</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Perangkat</TableHead>
                    <TableHead>Layanan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Biaya</TableHead>
                    <TableHead className="text-right">Dibuat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                        >
                          {order.order_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/customers/${order.customer_id}`}
                          className="block truncate hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                        >
                          {order.customer_name}
                        </Link>
                        <span className="block truncate text-xs text-zinc-400">
                          {order.customer_email}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-40 truncate text-xs">
                        {order.device || "—"}
                      </TableCell>
                      <TableCell className="max-w-40 truncate text-xs">
                        {order.service_name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatOrderCost(order.final_cost, order.estimated_cost)}
                      </TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap text-zinc-500">
                        {formatDateTime(order.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y divide-zinc-200 md:hidden dark:divide-zinc-800">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="block p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {order.order_number}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {order.customer_name}
                        </p>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div className="min-w-0">
                        <dt className="text-zinc-400">Perangkat</dt>
                        <dd className="truncate text-zinc-700 dark:text-zinc-300">
                          {order.device || "—"}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-zinc-400">Layanan</dt>
                        <dd className="truncate text-zinc-700 dark:text-zinc-300">
                          {order.service_name ?? "—"}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-zinc-400">Biaya</dt>
                        <dd className="truncate text-zinc-700 dark:text-zinc-300">
                          {formatOrderCost(
                            order.final_cost,
                            order.estimated_cost,
                          )}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-zinc-400">Dibuat</dt>
                        <dd className="truncate text-zinc-700 dark:text-zinc-300">
                          {formatDateTime(order.created_at)}
                        </dd>
                      </div>
                    </dl>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </AdminPageShell>
  );
}
