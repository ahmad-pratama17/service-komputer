import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  Layers,
  Loader2,
  Mail,
  Phone,
  Plus,
  WalletCards,
} from "lucide-react";
import { requireCustomer } from "@/lib/auth/session";
import { getCustomerDashboard } from "@/lib/orders";
import { StatCard } from "@/components/customer/stat-card";
import { OrderRow } from "@/components/customer/order-row";
import { NotificationList } from "@/components/customer/notification-list";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataErrorState } from "@/components/ui/data-error-state";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Dashboard",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function CustomerDashboardPage() {
  const user = await requireCustomer();
  const result = await getCustomerDashboard(user.id);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Selamat datang kembali, {user.name}</h1>
          <p className="mt-1 text-blue-100">
            Kelola pesanan service, tagihan, dan notifikasi Anda di sini.
          </p>
        </div>
        {/* Tombol di atas banner biru, jadi tetap putih dan tidak memakai variant default. */}
        <Link
          href="/dashboard/services/new"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
        >
          <Plus className="h-5 w-5" aria-hidden />
          Pesan Service
        </Link>
      </section>

      {result.ok && result.data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Layers} label="Total Service" value={result.data.totals.total} />
            <StatCard icon={Loader2} label="Service Aktif" value={result.data.totals.active} />
            <StatCard icon={CheckCircle2} label="Service Selesai" value={result.data.totals.completed} />
            <StatCard icon={WalletCards} label="Tagihan Belum Dibayar" value={result.data.totals.unpaidInvoices} />
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="space-y-3 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Pesanan Terbaru
                </h2>
                <Link
                  href="/dashboard/services"
                  className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Lihat semua
                </Link>
              </div>

              {result.data.recentOrders.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={<ClipboardList className="h-5 w-5" aria-hidden />}
                    title="Belum ada pesanan"
                    description="Mulai dengan memesan layanan pertama Anda."
                    action={
                      <Link
                        href="/dashboard/services/new"
                        className={buttonClassName("primary", "sm")}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        Pesan Service
                      </Link>
                    }
                  />
                </Card>
              ) : (
                <div className="space-y-3">
                  {result.data.recentOrders.map((order) => (
                    <OrderRow key={order.id} order={order} />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Notifikasi
                </h2>
                <Link
                  href="/dashboard/notifications"
                  className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Lihat semua
                </Link>
              </div>

              <Card>
                <CardContent className="px-5 py-1">
                  <NotificationList notifications={result.data.notifications} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-start gap-4 p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                    {initials(user.name) || "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {user.name}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                      <Mail className="h-3.5 w-3.5" aria-hidden />
                      <span className="truncate">{user.email}</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                      <Phone className="h-3.5 w-3.5" aria-hidden />
                      <span className="truncate">{user.phone ?? "—"}</span>
                    </p>
                    <Link
                      href="/dashboard/profile"
                      className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Kelola profil
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </>
      ) : (
        <DataErrorState message="Gagal memuat data dashboard." />
      )}
    </div>
  );
}