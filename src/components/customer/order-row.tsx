import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CustomerOrder } from "@/lib/orders";
import { formatCurrency, formatDate } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/customer/order-status-badge";

export function OrderRow({ order }: { order: CustomerOrder }) {
  return (
    <Link
      href={`/dashboard/services/${order.id}`}
      className="group block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
    >
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {order.order_number}
          </p>
          <p className="mt-0.5 truncate text-sm text-zinc-500">
            {order.service_name ?? "Layanan"}
          </p>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {order.estimated_cost !== null
              ? formatCurrency(order.estimated_cost)
              : "—"}
          </p>
          <p className="text-xs text-zinc-400">{formatDate(order.created_at)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
        <ChevronRight
          className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  );
}