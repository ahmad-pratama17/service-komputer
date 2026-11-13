import { getActiveServices } from "@/lib/services";
import { ServiceCard } from "@/components/landing/service-card";

type ServiceCatalogProps = {
  limit?: number;
};

export async function ServiceCatalog({ limit }: ServiceCatalogProps) {
  const services = await getActiveServices();
  const shown = limit ? services.slice(0, limit) : services;

  if (shown.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">
          Daftar layanan belum tersedia. Silakan cek kembali nanti.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>
  );
}