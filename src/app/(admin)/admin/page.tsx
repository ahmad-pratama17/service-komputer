import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminStatCards } from "@/components/admin/admin-stat-cards";
import { OrderStatusBadge } from "@/components/customer/order-status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ORDER_STATUS_LABEL, ORDER_STATUS_SEQUENCE } from "@/lib/constants";
import { getAdminOrders, getAdminStats } from "@/lib/admin";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Dashboard Admin",
};

export default async function AdminDashboardPage() {
  const user = await requireAdmin();
  const [statsResult, ordersResult] = await Promise.all([
    getAdminStats(),
    getAdminOrders({ limit: 6 }),
  ]);

  const recentOrders = ordersResult.ok ? ordersResult.data.orders : [];

  return (
    <AdminPageShell>
      <PageHeader
        title={`Halo, ${user.name.split(" ")[0]}`}
        description="Ringkasan operasional service hari ini."
      />

      {statsResult.ok ? (
        <AdminStatCards stats={statsResult.data} />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-zinc-500">
            {statsResult.error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle>Pesanan Terbaru</CardTitle>
            <CardDescription>
              Enam pesanan terakhir yang masuk dari pelanggan.
            </CardDescription>
          </div>
          <Link
            href="/admin/orders"
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Lihat semua
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {recentOrders.length === 0 ? (
            <EmptyState
              title="Belum ada pesanan"
              description="Pesanan pelanggan akan muncul di sini setelah dikirim."
            />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nomor Pesanan</TableHead>
                      <TableHead>Pelanggan</TableHead>
                      <TableHead>Layanan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Estimasi</TableHead>
                      <TableHead className="text-right">Dibuat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((order) => (
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
                          <span className="block truncate">{order.customer_name}</span>
                          <span className="block truncate text-xs text-zinc-400">
                            {order.customer_email}
                          </span>
                        </TableCell>
                        <TableCell>{order.service_name ?? "—"}</TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          {order.estimated_cost !== null
                            ? formatCurrency(order.estimated_cost)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-xs text-zinc-500">
                          {formatDateTime(order.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="divide-y divide-zinc-200 md:hidden dark:divide-zinc-800">
                {recentOrders.map((order) => (
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
                      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                        <span className="truncate">
                          {order.service_name ?? "Tanpa layanan"}
                        </span>
                        <span className="shrink-0">
                          {formatDateTime(order.created_at)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>StatusOperasional</CardTitle>
          <CardDescription>
            Distribusi status pesanan saat ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statsResult.ok ? (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ORDER_STATUS_SEQUENCE.map((status) => (
                <li key={status}>
                  <Link
                    href={`/admin/orders?status=${status}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2 transition-colors hover:border-blue-300 hover:bg-blue-50/60 dark:border-zinc-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
                  >
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {ORDER_STATUS_LABEL[status]}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {statsResult.data.statusCounts[status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Data tidak tersedia.</p>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
