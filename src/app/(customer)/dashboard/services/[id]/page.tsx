import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleCheck, TriangleAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/auth/session";
import { getCustomerOrderDetail } from "@/lib/orders";
import {
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
} from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/customer/order-status-badge";
import { OrderPhotoGallery } from "@/components/customer/order-photo-gallery";
import { OrderTimeline } from "@/components/customer/order-timeline";
import { OrderApprovalCard } from "@/components/customer/order-approval-card";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataErrorState } from "@/components/ui/data-error-state";

export const metadata: Metadata = {
  title: "Detail Pesanan",
};

const ORDER_ID_PARAM = "id";

function InfoItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <div className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
        {children}
      </div>
    </div>
  );
}

type OrderDetailPageProps = {
  params: Promise<{ [ORDER_ID_PARAM]: string }>;
  searchParams: Promise<{ created?: string; photoWarning?: string }>;
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: OrderDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);

  if (!id) {
    notFound();
  }

  const user = await requireCustomer();
  const result = await getCustomerOrderDetail(user.id, id);

  if (!result.ok) {
    return <DataErrorState message={result.error} />;
  }

  if (!result.data) {
    notFound();
  }

  const { order, history, invoice, photos, resultPhotos } = result.data;
  const isNewOrder = query.created === "1";
  const hasPhotoWarning = query.photoWarning === "1";

  const device = [
    order.device_type,
    order.device_brand,
    order.device_model,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <div className="space-y-6">
      {order.status === "waiting_approval" ? (
        <OrderApprovalCard
          orderId={order.id}
          estimatedCost={order.estimated_cost}
        />
      ) : null}

      {isNewOrder ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40"
        >
          <CircleCheck
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300"
            aria-hidden
          />
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              Pesanan berhasil dibuat
            </p>
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300/90">
              Nomor pesanan Anda {order.order_number} dengan status &quot;Menunggu
              Diterima&quot;. Admin akan segera memproses pesanan ini dan statusnya
              akan diperbarui di halaman ini.
            </p>
          </div>
        </div>
      ) : null}

      {hasPhotoWarning ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40"
        >
          <TriangleAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300"
            aria-hidden
          />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Foto tidak tersimpan
            </p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300/90">
              Pesanan Anda tetap berhasil dibuat, tetapi foto yang dilampirkan
              gagal disimpan. Silakan hubungi admin dan kirimkan ulang fotonya.
            </p>
          </div>
        </div>
      ) : null}

      <Link
        href="/dashboard/services"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Kembali ke pesanan
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {order.order_number}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Dibuat {formatDateTime(order.created_at)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Detail Layanan & Perangkat</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <InfoItem label="Service">
                {order.service_name ?? "Layanan"}
              </InfoItem>
              <InfoItem label="Perangkat">{device}</InfoItem>
              <div className="sm:col-span-2">
                <InfoItem label="Masalah">{order.problem_description}</InfoItem>
              </div>
              <InfoItem label="Alamat">
                {order.address ?? "—"}
              </InfoItem>
              <InfoItem label="Jadwal Diinginkan">
                {order.preferred_schedule
                  ? formatDateTime(order.preferred_schedule)
                  : "—"}
              </InfoItem>
              {order.additional_notes ? (
                <div className="sm:col-span-2">
                  <InfoItem label="Catatan Tambahan">
                    {order.additional_notes}
                  </InfoItem>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Foto Masalah / Perangkat</CardTitle>
              <CardDescription>
                Foto yang dilampirkan customer saat memesan service.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrderPhotoGallery photos={photos} />
            </CardContent>
          </Card>

          {resultPhotos.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Foto Hasil Service</CardTitle>
                <CardDescription>
                  Hasil pengerjaan yang diunggah teknisi.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OrderPhotoGallery photos={resultPhotos} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Diagnosis</CardTitle>
              <CardDescription>
                Hasil pemeriksaan oleh teknisi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {order.diagnosis ? (
                <p className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">
                  {order.diagnosis}
                </p>
              ) : (
                <p className="text-sm text-zinc-500">
                  Belum ada diagnosis. Teknisi akan memeriksa perangkat Anda.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Biaya</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Estimasi Biaya</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {order.estimated_cost !== null
                    ? formatCurrency(order.estimated_cost)
                    : "Belum ada"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <span className="text-sm text-zinc-500">Biaya Final</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {order.final_cost !== null
                    ? formatCurrency(order.final_cost)
                    : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {invoice ? (
            <Card>
              <CardHeader>
                <CardTitle>Invoice</CardTitle>
                <CardDescription>{invoice.invoice_number}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Status</span>
                  <Badge variant={PAYMENT_STATUS_VARIANT[invoice.payment_status]}>
                    {PAYMENT_STATUS_LABEL[invoice.payment_status]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Subtotal</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
                  <span className="text-sm text-zinc-500">Total</span>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(invoice.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Diterbitkan {formatDate(invoice.issued_at)}</span>
                  {invoice.paid_at ? (
                    <span>Dibayar {formatDate(invoice.paid_at)}</span>
                  ) : null}
                </div>
                <Link
                  href={`/dashboard/invoices/${invoice.id}`}
                  className={buttonClassName("outline", "sm") + " w-full"}
                >
                  Lihat detail tagihan
                </Link>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status Perjalanan Pesanan</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTimeline history={history} />
        </CardContent>
      </Card>
    </div>
  );
}