import type { Metadata } from "next";
import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { DataToolbar } from "@/components/admin/data-toolbar";
import { InvoicePaymentControl } from "@/components/admin/invoice-payment-control";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminInvoices } from "@/lib/admin";
import {
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
} from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Tagihan Admin",
};

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const search = params.q ?? "";

  const result = await getAdminInvoices();
  const allInvoices = result.ok ? result.data : [];

  const searchTerm = search.trim().toLowerCase();
  const invoices = searchTerm
    ? allInvoices.filter(
        (invoice) =>
          invoice.invoice_number.toLowerCase().includes(searchTerm) ||
          invoice.order_number.toLowerCase().includes(searchTerm) ||
          invoice.customer_name.toLowerCase().includes(searchTerm),
      )
    : allInvoices;

  const outstanding = invoices
    .filter((invoice) => invoice.payment_status !== "paid")
    .reduce((sum, invoice) => sum + invoice.total, 0);

  const collected = invoices
    .filter((invoice) => invoice.payment_status === "paid")
    .reduce((sum, invoice) => sum + invoice.total, 0);

  return (
    <AdminPageShell>
      <PageHeader
        title="Tagihan"
        description="Pantau invoice dan perbarui status pembayaran pelanggan."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Total terkumpul
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(collected)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Belum tertagih
            </p>
            <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">
              {formatCurrency(outstanding)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <DataToolbar
          filterKey="admin-invoices"
          searchValue={search}
          searchPlaceholder="Cari nomor invoice, nomor pesanan, atau pelanggan"
          total={allInvoices.length}
          filtered={invoices.length}
        />

        {!result.ok ? (
          <EmptyState title={result.error} />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<ReceiptText className="h-5 w-5" aria-hidden />}
            title="Tidak ada tagihan"
            description={
              searchTerm
                ? "Tidak ada tagihan yang cocok dengan pencarian Anda."
                : "Tagihan dibuat otomatis saat pesanan selesai."
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor Invoice</TableHead>
                    <TableHead>Pesanan</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  <TableHead className="text-right">Diterbitkan</TableHead>
                  <TableHead className="text-right">Jatuh Tempo</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/orders/${invoice.order_id}`}
                          className="text-xs hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                        >
                          {invoice.order_number}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-40 truncate text-xs">
                        {invoice.customer_name}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={PAYMENT_STATUS_VARIANT[invoice.payment_status]}>
                          {PAYMENT_STATUS_LABEL[invoice.payment_status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap text-zinc-500">
                        {formatDateTime(invoice.issued_at)}
                      </TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap text-zinc-500">
                        {invoice.due_at ? formatDate(invoice.due_at) : "—"}
                      </TableCell>
                      <TableCell>
                        <InvoicePaymentControl
                          invoiceId={invoice.id}
                          currentStatus={invoice.payment_status}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y divide-zinc-200 md:hidden dark:divide-zinc-800">
              {invoices.map((invoice) => (
                <li key={invoice.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {invoice.invoice_number}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {invoice.order_number} · {invoice.customer_name}
                      </p>
                    </div>
                    <Badge variant={PAYMENT_STATUS_VARIANT[invoice.payment_status]}>
                      {PAYMENT_STATUS_LABEL[invoice.payment_status]}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(invoice.total)}
                    </span>
                    <InvoicePaymentControl
                      invoiceId={invoice.id}
                      currentStatus={invoice.payment_status}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </AdminPageShell>
  );
}
