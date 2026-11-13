import type { Metadata } from "next";
import { requireCustomer } from "@/lib/auth/session";
import { getActiveServices } from "@/lib/services";
import { OrderForm } from "@/components/customer/order-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pesan Service",
};

export default async function NewOrderPage() {
  await requireCustomer();
  const services = await getActiveServices();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Pesan Service
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Lengkapi detail perangkat dan masalah Anda, lalu kirim pesanan.
        </p>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-zinc-500">
              Daftar layanan belum tersedia. Silakan coba lagi nanti.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Form Pemesanan</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderForm services={services} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}