import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCustomer } from "@/lib/auth/session";
import { getCustomerOrders } from "@/lib/orders";
import { OrderRow } from "@/components/customer/order-row";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataErrorState } from "@/components/ui/data-error-state";

export const metadata: Metadata = {
  title: "Pesanan Service",
};

export default async function CustomerServicesPage() {
  const user = await requireCustomer();
  const result = await getCustomerOrders(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Pesanan Service
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Daftar semua pesanan layanan Anda.
          </p>
        </div>
        <Link
          href="/dashboard/services/new"
          className={buttonClassName("primary", "sm")}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Pesan Service
        </Link>
      </div>

      {!result.ok ? (
        <DataErrorState message={result.error} />
      ) : result.data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-zinc-500">
              Anda belum memiliki pesanan service.
            </p>
            <Link
              href="/dashboard/services/new"
              className={buttonClassName("primary", "sm")}
            >
              Pesan Service Pertama
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {result.data.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}