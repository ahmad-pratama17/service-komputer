import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin } from "lucide-react";
import { TeknisiPageShell } from "@/components/teknisi/teknisi-page-shell";
import { TeknisiDiagnosisForm } from "@/components/teknisi/teknisi-diagnosis-form";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { ResultPhotosPanel } from "@/components/admin/result-photos-panel";
import { OrderAiCopilot } from "@/components/admin/order-ai-copilot";
import { OrderPhotoGallery } from "@/components/customer/order-photo-gallery";
import { OrderStatusBadge } from "@/components/customer/order-status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminOrderDetail } from "@/lib/admin";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { requireStaff } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Detail Pesanan",
};

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-sm text-zinc-900 dark:text-zinc-100">{value || "—"}</dd>
    </div>
  );
}

export default async function TeknisiOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;

  const result = await getAdminOrderDetail(id);
  if (!result.ok) {
    return (
      <TeknisiPageShell>
        <PageHeader title="Detail Pesanan" />
        <Card>
          <EmptyState title={result.error} />
        </Card>
      </TeknisiPageShell>
    );
  }

  if (!result.data) {
    notFound();
  }

  const { order, history, photos, resultPhotos, previousOrderCount } =
    result.data;

  return (
    <TeknisiPageShell>
      <div className="space-y-1">
        <Link
          href="/teknisi/orders"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar pesanan
        </Link>
      </div>

      <PageHeader
        title={order.order_number}
        description={`Dibuat ${formatDateTime(order.created_at)} · Diperbarui ${formatDateTime(order.updated_at)}`}
        actions={<OrderStatusBadge status={order.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Informasi Pesanan</CardTitle>
              <CardDescription>Detail layanan dan perangkat yang dikirim pelanggan.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-x-8 sm:grid-cols-2">
              <dl className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <DetailRow label="Layanan" value={order.service_name} />
                <DetailRow label="Jenis Perangkat" value={order.device_type} />
                <DetailRow label="Merek" value={order.device_brand} />
                <DetailRow label="Model" value={order.device_model} />
                <DetailRow label="Jadwal Diinginkan" value={order.preferred_schedule} />
              </dl>
              <dl className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <DetailRow
                  label="Estimasi Biaya"
                  value={
                    order.estimated_cost !== null
                      ? formatCurrency(order.estimated_cost)
                      : null
                  }
                />
                <DetailRow
                  label="Biaya Final"
                  value={
                    order.final_cost !== null
                      ? formatCurrency(order.final_cost)
                      : null
                  }
                />
                <DetailRow label="Alamat" value={order.address} />
                <DetailRow label="Diagnosa" value={order.diagnosis} />
              </dl>

              <div className="sm:col-span-2">
                <DetailRow label="Deskripsi Masalah" value={order.problem_description} />
              </div>
              <div className="sm:col-span-2">
                <DetailRow label="Catatan Tambahan Pelanggan" value={order.additional_notes} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Foto dari Pelanggan</CardTitle>
              <CardDescription>
                {photos.length > 0
                  ? `${photos.length} foto terlampir.`
                  : "Pelanggan tidak melampirkan foto."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <EmptyState
                  title="Tidak ada foto"
                  description="Pelanggan tidak mengirim foto pada pesanan ini."
                />
              ) : (
                <OrderPhotoGallery photos={photos} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Foto Hasil Service</CardTitle>
              <CardDescription>
                Foto hasil pengerjaan yang dilihat pelanggan pada detail
                pesanan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResultPhotosPanel orderId={order.id} photos={resultPhotos} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>AI Copilot</CardTitle>
              <CardDescription>
                Ringkasan keluhan, dugaan penyebab, dan rekomendasi pemeriksaan.
                Hasil wajib direview sebelum dipakai.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrderAiCopilot
                orderId={order.id}
                hasHistory={previousOrderCount > 0}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Riwayat Status</CardTitle>
              <CardDescription>
                Transisi status tercatat otomatis oleh sistem, lengkap dengan
                pelaku perubahan.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {history.length === 0 ? (
                <EmptyState title="Belum ada riwayat" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Dari</TableHead>
                        <TableHead>Ke</TableHead>
                        <TableHead>Pelaku</TableHead>
                        <TableHead>Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDateTime(entry.created_at)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {entry.old_status
                              ? ORDER_STATUS_LABEL[entry.old_status]
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <OrderStatusBadge status={entry.new_status} />
                          </TableCell>
                          <TableCell className="text-xs">
                            {entry.changed_by_name ??
                              (entry.changed_by ? "Pengguna" : "Sistem")}
                          </TableCell>
                          <TableCell className="text-xs">{entry.note ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Pelanggan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {order.customer_name}
              </p>
              <p className="flex items-center gap-2 text-xs text-zinc-500">
                <Mail className="h-3.5 w-3.5" aria-hidden />
                <span className="truncate">{order.customer_email}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Ubah Status</CardTitle>
              <CardDescription>
                Hanya status yang valid untuk tahap ini yang bisa dipilih.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrderStatusForm orderId={order.id} currentStatus={order.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Diagnosis</CardTitle>
              <CardDescription>
                Hasil pemeriksaan teknisi. Biaya hanya bisa diubah admin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeknisiDiagnosisForm
                orderId={order.id}
                diagnosis={order.diagnosis}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Alamat Layanan</CardTitle>
            </CardHeader>
            <CardContent>
              {order.address ? (
                <p className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                  {order.address}
                </p>
              ) : (
                <p className="text-sm text-zinc-500">Alamat belum diisi.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TeknisiPageShell>
  );
}
