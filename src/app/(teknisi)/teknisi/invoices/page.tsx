import type { Metadata } from "next";
import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { TeknisiPageShell } from "@/components/teknisi/teknisi-page-shell";
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
import { getAdminInvoices } from "@/lib/admin";
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_VARIANT } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { requireStaff } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Tagihan Teknisi",
};

export default async function TeknisiInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireStaff();
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

  return (
    <TeknisiPageShell>
      <PageHeader
        title="Tagihan"
        description="Lihat tagihan pesanan. Menerbitkan dan mengubah status pembayaran hanya bisa dilakukan admin."
      />

      <Card className="overflow-hidden">
        <DataToolbar
          filterKey="teknisi-invoices"
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
                : "Tagihan dibuat admin saat pesanan selesai."
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
                          href={`/teknisi/orders/${invoice.order_id}`}
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
                        <Badge
                          variant={
                            PAYMENT_STATUS_VARIANT[invoice.payment_status]
                          }
                        >
                          {PAYMENT_STATUS_LABEL[invoice.payment_status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap text-zinc-500">
                        {formatDateTime(invoice.issued_at)}
                      </TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap text-zinc-500">
                        {invoice.due_at ? formatDate(invoice.due_at) : "—"}
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
                    <Badge
                      variant={PAYMENT_STATUS_VARIANT[invoice.payment_status]}
                    >
                      {PAYMENT_STATUS_LABEL[invoice.payment_status]}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(invoice.total)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </TeknisiPageShell>
  );
}
