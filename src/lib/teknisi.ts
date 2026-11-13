import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mode";
import { demoTeknisiStats } from "@/lib/demo/queries";
import type { OrderStatus } from "@/types";
import type { Result } from "@/lib/admin";

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const GENERIC_ERROR = "Gagal memuat data. Silakan coba lagi.";

/**
 * Statistik dasbor teknisi. Disengaja TIDAK memuat angka keuangan
 * (revenue, tagihan terkumpul/belum tertagih): peran teknisi untuk tagihan
 * adalah lihat-saja per baris, bukan memantau keuangan. Menghitung sendiri
 * supaya nilai sensitif tidak pernah masuk ke payload halaman teknisi.
 */
export type TeknisiStats = {
  totalOrders: number;
  pendingOrders: number;
  activeServices: number;
  completedServices: number;
  statusCounts: Record<OrderStatus, number>;
};

const ALL_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "accepted",
  "diagnosis",
  "waiting_approval",
  "in_progress",
  "completed",
  "paid",
  "closed",
  "cancelled",
];

const COMPLETED_ORDER_STATUSES: OrderStatus[] = [
  "completed",
  "paid",
  "closed",
];

export async function getTeknisiStats(): Promise<Result<TeknisiStats>> {
  if (isDemoMode()) {
    return { ok: true, data: demoTeknisiStats() };
  }

  if (!hasSupabaseEnv) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();

  const [ordersResult, servicesResult] = await Promise.all([
    supabase.from("service_orders").select("id, status"),
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  if (ordersResult.error) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const orders = ordersResult.data ?? [];

  const statusCounts = Object.fromEntries(
    ALL_ORDER_STATUSES.map((status) => [status, 0]),
  ) as Record<OrderStatus, number>;

  for (const row of orders) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
  }

  return {
    ok: true,
    data: {
      statusCounts,
      totalOrders: orders.length,
      pendingOrders: orders.filter((row) => row.status === "pending").length,
      activeServices: servicesResult.count ?? 0,
      completedServices: orders.filter((row) =>
        COMPLETED_ORDER_STATUSES.includes(row.status),
      ).length,
    },
  };
}
