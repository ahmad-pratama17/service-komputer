import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TeknisiPageShell } from "@/components/teknisi/teknisi-page-shell";
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
import { ORDER_STATUS_LABEL, ORDER_STATUS_SEQUENCE } from "@/lib/constants";
import { getAdminOrders } from "@/lib/admin";
import { getTeknisiStats } from "@/lib/teknisi";
import { formatDateTime } from "@/lib/utils";
import { requireStaff } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Dashboard Teknisi",
};

export default async function TeknisiDashboardPage() {
  const user = await requireStaff();
  const [statsResult, ordersResult] = await Promise.all([
    getTeknisiStats(),
    getAdminOrders({ limit: 6 }),
  ]);

  const recentOrders = ordersResult.ok ? ordersResult.data.orders : [];
  const stats = statsResult.ok ? statsResult.data : null;

  return (
    <TeknisiPageShell>
      <PageHeader
        title={`Halo, ${user.name.split(" ")[0]}`}
        description="Antrean pengerjaan service hari ini."
      />

      {statsResult.ok ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total pesanan", value: statsResult.data.totalOrders },
            {
              label: "Menunggu tinjauan",
              value: statsResult.data.pendingOrders,
            },
            { label: "Layanan aktif", value: statsResult.data.activeServices },
            {
              label: "Pengerjaan selesai",
              value: statsResult.data.completedServices,
            },
          ].map((card) => (
            <Card key={card.label}>
              <CardContent className="p-5">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {card.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
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
            href="/teknisi/orders"
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
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/teknisi/orders/${order.id}`}
                    className="block p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {order.order_number}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {order.customer_name} ·{" "}
                          {order.service_name ?? "Tanpa layanan"}
                        </p>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {formatDateTime(order.created_at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Status Pengerjaan</CardTitle>
          <CardDescription>Distribusi status pesanan saat ini.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats ? (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ORDER_STATUS_SEQUENCE.map((status) => (
                <li key={status}>
                  <Link
                    href={`/teknisi/orders?status=${status}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2 transition-colors hover:border-blue-300 hover:bg-blue-50/60 dark:border-zinc-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
                  >
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {ORDER_STATUS_LABEL[status]}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {stats.statusCounts[status]}
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
    </TeknisiPageShell>
  );
}
