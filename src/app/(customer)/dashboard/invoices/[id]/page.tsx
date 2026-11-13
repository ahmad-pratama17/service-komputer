import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Banknote, CircleCheck, Clock } from "lucide-react";
import { requireCustomer } from "@/lib/auth/session";
import { getCustomerInvoice } from "@/lib/orders";
import { APP_NAME, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_VARIANT } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataErrorState } from "@/components/ui/data-error-state";

export const metadata: Metadata = {
  title: "Detail Tagihan",
};

const INVOICE_ID_PARAM = "id";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="shrink-0 text-sm text-zinc-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {children}
      </dd>
    </div>
  );
}

export default async function CustomerInvoiceDetailPage({
  params,
}: {
  params: Promise<{ [INVOICE_ID_PARAM]: string }>;
}) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const user = await requireCustomer();
  const result = await getCustomerInvoice(user.id, id);

  if (!result.ok) {
    return <DataErrorState message={result.error} />;
  }

  // Tagihan milik orang lain sengaja dikembalikan 404, bukan 403, supaya
  // ID tagihan tidak bisa dipetakan keMilik siapa pun.
  if (!result.data) {
    notFound();
  }

  const invoice = result.data;
  const isPaid = invoice.payment_status === "paid";
  const isPending = invoice.payment_status === "pending";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Kembali ke daftar tagihan
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Invoice {invoice.invoice_number}</CardTitle>
              <p className="mt-1 text-xs text-zinc-500">
                {APP_NAME} · Diterbitkan {formatDate(invoice.issued_at)}
              </p>
            </div>
            <Badge variant={PAYMENT_STATUS_VARIANT[invoice.payment_status]}>
              {PAYMENT_STATUS_LABEL[invoice.payment_status]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <dl className="divide-y divide-zinc-200 dark:divide-zinc-800">
            <Row label="Nomor Invoice">{invoice.invoice_number}</Row>
            <Row label="Nomor Pesanan">{invoice.order_number}</Row>
            <Row label="Pelanggan">{user.name || user.email}</Row>
            <Row label="Layanan">{invoice.service_name ?? "—"}</Row>
          </dl>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Deskripsi
            </p>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-zinc-700 dark:text-zinc-300">
              {invoice.description}
            </p>
          </div>

          <dl className="divide-y divide-zinc-200 dark:divide-zinc-800">
            <Row label="Subtotal">{formatCurrency(invoice.subtotal)}</Row>
            <Row label="Total">
              <span className="text-lg font-bold">
                {formatCurrency(invoice.total)}
              </span>
            </Row>
            <Row label="Tanggal Terbit">{formatDate(invoice.issued_at)}</Row>
            <Row label="Jatuh Tempo">
              {invoice.due_at ? formatDate(invoice.due_at) : "—"}
            </Row>
            <Row label="Tanggal Bayar">
              {invoice.paid_at ? formatDate(invoice.paid_at) : "—"}
            </Row>
          </dl>

          {isPaid ? (
            <p className="flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Pembayaran Anda sudah kami terima pada{" "}
              {invoice.paid_at ? formatDate(invoice.paid_at) : "—"}. Terima kasih.
            </p>
          ) : isPending ? (
            <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Pembayaran Anda sedang menunggu verifikasi admin. Status akan
              diperbarui di halaman ini setelah dikonfirmasi.
            </p>
          ) : (
            <p className="flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
              <Banknote className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Belum dibayar. Hubungi admin melalui halaman Notifikasi untuk
              konfirmasi cara pembayaran.
            </p>
          )}

          <Link
            href={`/dashboard/services/${invoice.order_id}`}
            className={buttonClassName("outline")}
          >
            Lihat pesanan terkait
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}