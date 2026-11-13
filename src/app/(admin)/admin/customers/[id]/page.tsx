import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { OrderStatusBadge } from "@/components/customer/order-status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminCustomerDetail } from "@/lib/admin";
import { formatCurrency, formatDate, formatDateTime, formatOrderCost } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Detail Pelanggan",
};

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const result = await getAdminCustomerDetail(id);

  if (!result.ok) {
    return (
      <AdminPageShell>
        <PageHeader title="Detail Pelanggan" />
        <Card>
          <EmptyState title={result.error} />
        </Card>
      </AdminPageShell>
    );
  }

  if (!result.data) {
    notFound();
  }

  const { customer, orders } = result.data;
  const lifetimeValue = orders.reduce(
    (sum, order) => sum + (order.final_cost ?? order.estimated_cost ?? 0),
    0,
  );

  return (
    <AdminPageShell>
      <div className="space-y-1">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar pelanggan
        </Link>
      </div>

      <PageHeader
        title={customer.name}
        description={`Pelanggan sejak ${formatDate(customer.created_at)}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Riwayat Pesanan</CardTitle>
              <CardDescription>
                {orders.length > 0
                  ? `${orders.length} pesanan dari pelanggan ini.`
                  : "Pelanggan ini belum pernah membuat pesanan."}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {orders.length === 0 ? (
                <EmptyState
                  title="Belum ada pesanan"
                  description="Pesanan pelanggan akan tampil di sini."
                />
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nomor Pesanan</TableHead>
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
                            <TableCell className="max-w-40 truncate text-xs">
                              {order.service_name ?? "—"}
                            </TableCell>
                            <TableCell>
                              <OrderStatusBadge status={order.status} />
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {formatOrderCost(
                                order.final_cost,
                                order.estimated_cost,
                              )}
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
                            <p className="min-w-0 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {order.order_number}
                            </p>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                            <span className="truncate">
                              {order.service_name ?? "—"}
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
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Kontak</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <Mail className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                <span className="truncate">{customer.email}</span>
              </p>
              <p className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <Phone className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                {customer.phone ?? "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Total pesanan</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {customer.order_count}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Pesanan terakhir</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {customer.last_order_at
                    ? formatDate(customer.last_order_at)
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Nilai estimasi</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(lifetimeValue)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageShell>
  );
}
