import type { Metadata } from "next";
import { ServiceCatalog } from "@/components/landing/service-catalog";

export const metadata: Metadata = {
  title: "Layanan",
};

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-12 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Layanan Kami
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Daftar lengkap layanan service komputer & IT beserta estimasi biaya
          dan lama pengerjaan.
        </p>
      </div>
      <ServiceCatalog />
    </div>
  );
}