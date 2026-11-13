import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { DataToolbar } from "@/components/admin/data-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminCustomers } from "@/lib/admin";
import { formatDate, formatDateTime } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Pelanggan Admin",
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const search = params.q ?? "";

  const result = await getAdminCustomers();
  const allCustomers = result.ok ? result.data : [];

  const searchTerm = search.trim().toLowerCase();
  const customers = searchTerm
    ? allCustomers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm) ||
          customer.email.toLowerCase().includes(searchTerm) ||
          (customer.phone ?? "").toLowerCase().includes(searchTerm),
      )
    : allCustomers;

  return (
    <AdminPageShell>
      <PageHeader
        title="Pelanggan"
        description="Daftar seluruh pelanggan terdaftar beserta aktivitas pesanan mereka."
      />

      <Card className="overflow-hidden">
        <DataToolbar
          filterKey="admin-customers"
          searchValue={search}
          searchPlaceholder="Cari nama, email, atau nomor telepon"
          total={allCustomers.length}
          filtered={customers.length}
        />

        {!result.ok ? (
          <EmptyState title={result.error} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" aria-hidden />}
            title="Tidak ada pelanggan"
            description={
              searchTerm
                ? "Tidak ada pelanggan yang cocok dengan pencarian Anda."
                : "Pelanggan akan muncul setelah mendaftar."
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead className="text-right">Pesanan</TableHead>
                    <TableHead className="text-right">Pesanan Terakhir</TableHead>
                    <TableHead className="text-right">Terdaftar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                        >
                          {customer.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">{customer.email}</TableCell>
                      <TableCell className="text-xs">
                        {customer.phone ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {customer.order_count > 0 ? (
                          <Badge variant="info">{customer.order_count}</Badge>
                        ) : (
                          <span className="text-xs text-zinc-400">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap text-zinc-500">
                        {customer.last_order_at
                          ? formatDateTime(customer.last_order_at)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap text-zinc-500">
                        {formatDate(customer.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y divide-zinc-200 md:hidden dark:divide-zinc-800">
              {customers.map((customer) => (
                <li key={customer.id}>
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    className="block p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {customer.name}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {customer.email}
                        </p>
                      </div>
                      <Badge variant={customer.order_count > 0 ? "info" : "default"}>
                        {customer.order_count} pesanan
                      </Badge>
                    </div>
                    <p className="mt-2 truncate text-xs text-zinc-400">
                      {customer.phone ?? "Tanpa nomor telepon"} · Terdaftar{" "}
                      {formatDate(customer.created_at)}
                    </p>
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
