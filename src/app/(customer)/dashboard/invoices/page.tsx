import type { Metadata } from "next";
import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { requireCustomer } from "@/lib/auth/session";
import { getCustomerInvoices } from "@/lib/orders";
import {
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
} from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DataErrorState } from "@/components/ui/data-error-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Tagihan",
};

export default async function CustomerInvoicesPage() {
  const user = await requireCustomer();
  const result = await getCustomerInvoices(user.id);
  const invoices = result.ok ? result.data : [];

  const outstanding = invoices
    .filter((invoice) => invoice.payment_status !== "paid")
    .reduce((sum, invoice) => sum + invoice.total, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Tagihan
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Semua invoice untuk pesanan service Anda.
        </p>
      </div>

      {invoices.length > 0 ? (
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Total belum lunas
              </p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(outstanding)}
              </p>
            </div>
            <p className="text-right text-xs text-zinc-500">
              {invoices.length} tagihan
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!result.ok ? (
        <DataErrorState message={result.error} />
      ) : invoices.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ReceiptText className="h-5 w-5" aria-hidden />}
            title="Belum ada tagihan"
            description="Tagihan akan muncul di sini setelah admin menerbitkannya untuk pesanan Anda."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Invoice</TableHead>
                  <TableHead>Pesanan</TableHead>
                  <TableHead>Layanan</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Jatuh Tempo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="font-medium hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">{invoice.order_number}</TableCell>
                    <TableCell className="max-w-48 truncate text-xs">
                      {invoice.service_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {formatCurrency(invoice.total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={PAYMENT_STATUS_VARIANT[invoice.payment_status]}
                      >
                        {PAYMENT_STATUS_LABEL[invoice.payment_status]}
                      </Badge>
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
                      {invoice.order_number} · {invoice.service_name ?? "—"}
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
                  <Link
                    href={`/dashboard/invoices/${invoice.id}`}
                    className={buttonClassName("outline", "sm")}
                  >
                    Detail
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}