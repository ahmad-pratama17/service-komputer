import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { TeknisiPageShell } from "@/components/teknisi/teknisi-page-shell";
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
import { getAdminServices } from "@/lib/admin";
import { SERVICE_CATEGORY_LABEL } from "@/lib/constants";
import { formatCurrency, formatDuration } from "@/lib/utils";
import { requireStaff } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Layanan Teknisi",
};

export default async function TeknisiServicesPage() {
  await requireStaff();

  const result = await getAdminServices();
  const services = result.ok ? result.data : [];
  const activeCount = services.filter((service) => service.is_active).length;

  return (
    <TeknisiPageShell>
      <PageHeader
        title="Layanan"
        description={
          services.length > 0
            ? `${services.length} layanan terdaftar, ${activeCount} aktif. Mengubah katalog hanya bisa dilakukan admin.`
            : "Katalog layanan yang tersedia untuk pelanggan."
        }
      />

      {!result.ok ? (
        <Card>
          <EmptyState title={result.error} />
        </Card>
      ) : services.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wrench className="h-5 w-5" aria-hidden />}
            title="Belum ada layanan"
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Layanan</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Harga Mulai</TableHead>
                  <TableHead className="text-right">Durasi</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <span className="block font-medium">{service.name}</span>
                      {service.description ? (
                        <span className="block max-w-md truncate text-xs text-zinc-400">
                          {service.description}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs">
                      {SERVICE_CATEGORY_LABEL[service.category]}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(service.starting_price)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-xs">
                      {formatDuration(service.estimated_duration)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.is_active ? "success" : "default"}>
                        {service.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-zinc-200 md:hidden dark:divide-zinc-800">
            {services.map((service) => (
              <li key={service.id} className="space-y-1 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {service.name}
                  </p>
                  <Badge variant={service.is_active ? "success" : "default"}>
                    {service.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-500">
                  {SERVICE_CATEGORY_LABEL[service.category]} ·{" "}
                  {formatCurrency(service.starting_price)} ·{" "}
                  {formatDuration(service.estimated_duration)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </TeknisiPageShell>
  );
}
