import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Wrench } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ServiceManager } from "@/components/admin/service-manager";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { getAdminServices } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Layanan Admin",
};

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const result = await getAdminServices();
  const services = result.ok ? result.data : [];

  const activeCount = services.filter((service) => service.is_active).length;

  return (
    <AdminPageShell>
      <PageHeader
        title="Layanan"
        description={
          services.length > 0
            ? `${services.length} layanan terdaftar, ${activeCount} aktif dan bisa dipesan.`
            : "Kelola layanan yang tersedia untuk pelanggan."
        }
        actions={
          <Link
            href="/services"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Lihat halaman publik
          </Link>
        }
      />

      {params.created === "1" ? (
        <p
          className="flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          role="status"
        >
          <CircleCheck className="h-4 w-4 shrink-0" aria-hidden />
          Layanan baru berhasil dibuat.
        </p>
      ) : null}

      {!result.ok ? (
        <Card>
          <EmptyState title={result.error} />
        </Card>
      ) : (
        <div className="space-y-4">
          {services.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Wrench className="h-5 w-5" aria-hidden />}
                title="Belum ada layanan"
                description="Tambahkan layanan pertama Anda menggunakan tombol Layanan Baru di bawah."
              />
            </Card>
          ) : null}

          <Card className="overflow-hidden">
            <ServiceManager services={services} />
          </Card>
        </div>
      )}
    </AdminPageShell>
  );
}
